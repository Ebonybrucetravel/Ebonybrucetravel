import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AiService {
  private embeddings: GoogleGenerativeAIEmbeddings;
  private llm: ChatGoogleGenerativeAI;
  private supabase: SupabaseClient;
  private readonly logger = new Logger(AiService.name);

  constructor() {
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      model: 'gemini-embedding-001',
      apiKey: process.env.GOOGLE_AI_API_KEY,
      outputDimensionality: 768,
    });

    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey: process.env.GOOGLE_AI_API_KEY,
      temperature: 0.1, // Strict adherence to facts
    });

    this.supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    );
  }

  /**
   * Ingestion: Takes website text, breaks it into chunks, vectorizes it, and saves to Supabase.
   */
  async ingestText(text: string, sourceUrl: string) {
    try {
      this.logger.log(`Starting ingestion for: ${sourceUrl}`);

      // ✅ FIX 1: Split specifically by Markdown headers so chunks remain topic-focused
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1200, 
        chunkOverlap: 150,
        separators: ["\n### ", "\n## ", "\n# ", "\n\n", "\n", " "], 
      });
      const chunks = await splitter.splitText(text);

      let insertedCount = 0;
      for (const chunk of chunks) {
        // ✅ Add a prefix so the AI knows where this text came from
        const contentToEmbed = `Source: ${sourceUrl}\n\n${chunk}`;
        
        const embedding = await this.embeddings.embedQuery(contentToEmbed);

        const { error } = await this.supabase.from('documents').insert({
          content: contentToEmbed,
          metadata: { source: sourceUrl },
          embedding: embedding,
        });

        if (error) {
          this.logger.error(`Error inserting chunk to Supabase: ${error.message}`);
          throw error;
        }
        insertedCount++;
      }

      this.logger.log(`Successfully ingested ${insertedCount} chunks.`);
      return { success: true, chunksStored: insertedCount };
    } catch (error: any) {
      this.logger.error(`Ingestion failed: ${error.message}`);
      throw new Error('Failed to ingest text');
    }
  }

  /**
   * Ask: Takes a user question, finds relevant website info, and generates an answer.
   */
  async ask(question: string, frontendContext?: any) {
    try {
      const lines = question.split('\n');
      const actualQuestion = lines[lines.length - 1].replace(/^User:\s*/i, '').trim();

      this.logger.log(`User asked: ${actualQuestion}`);

      // 1. Convert the actual question into a vector
      const queryEmbedding = await this.embeddings.embedQuery(actualQuestion);

      // 2. Search Supabase (✅ FIX 2: Lowered threshold to 0.25)
      const { data: matches, error } = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.25, 
        match_count: 6, 
      });

      if (error) {
        this.logger.error(`Supabase search error: ${error.message}`);
        throw error;
      }

      // 3. Combine the found chunks into a single "Context" string
      const context = matches?.map((m: any) => m.content).join('\n\n') || '';

      if (!context) {
        return {
          answer: "I don't have that information in my system. Would you like me to connect you to a human agent?",
          sources: [],
        };
      }

      // 4. Build the final prompt for Gemini
      const prompt = `
You are the official AI Travel Assistant for Ebony Bruce Travels.
Your job is to answer customer questions accurately using ONLY the information provided in the "Context" below.

=== CRITICAL RULES (STRICTLY ENFORCE) ===
1. NEVER invent prices, availability, delivery dates, admission outcomes, visa outcomes, or booking confirmations.
2. If the "Context" mentions flight booking but flags it as needing confirmation, you MUST tell the user that a human agent will need to confirm the flight scope.
3. Do NOT provide immigration or visa representation. Tell the user we only provide educational consulting.
4. If the exact answer is not contained in the Context, you must say exactly: "I don't have that information. Would you like me to connect you to a human agent?"
5. Be polite, professional, and concise.

=== LIVE USER CONTEXT ===
${frontendContext ? JSON.stringify(frontendContext) : 'No live context provided.'}

=== KNOWLEDGE BASE CONTEXT ===
${context}
===============================

User Question:
${question}
`;

      // 5. Ask Gemini
      const response = await this.llm.invoke(prompt);

      return {
        answer: response.content,
        sources: matches?.map((m: any) => m.metadata?.source) || [],
      };
    } catch (error: any) {
      this.logger.error(`Ask AI failed: ${error.message}`);
      return {
        answer: "I'm having trouble connecting right now. Would you like me to connect you to a human agent?",
        sources: [],
      };
    }
  }
}
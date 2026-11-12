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
      temperature: 0.1, 
    });

    this.supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    );
  }

  async ingestText(text: string, sourceUrl: string) {
    try {
      this.logger.log(`Starting ingestion for: ${sourceUrl}`);

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1200, 
        chunkOverlap: 150,
        separators: ["\n### ", "\n## ", "\n# ", "\n\n", "\n", " "], 
      });
      const chunks = await splitter.splitText(text);

      let insertedCount = 0;
      for (const chunk of chunks) {
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

  async ask(question: string, frontendContext?: any) {
    try {
      const lines = question.split('\n');
      const actualQuestion = lines[lines.length - 1].replace(/^User:\s*/i, '').trim();

      this.logger.log(`User asked: ${actualQuestion}`);

      const queryEmbedding = await this.embeddings.embedQuery(actualQuestion);

      // ✅ FIX: Set threshold to 0.0 and match_count to 15 to grab more context
      const { data: matches, error } = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.0, 
        match_count: 15, // 👈 Increased from 6 to 15
      });

      if (error) {
        this.logger.error(`Supabase search error: ${error.message}`);
        throw error;
      }

      // 👇 DEBUG LOGS
      this.logger.log(`Found ${matches?.length || 0} matches from Supabase.`);
      if (matches && matches.length > 0) {
        this.logger.log(`Top match similarity: ${matches[0].similarity}`);
        this.logger.log(`Top match snippet: ${matches[0].content.substring(0, 150)}...`);
      }

      const context = matches?.map((m: any) => m.content).join('\n\n') || '';

      if (!context) {
        this.logger.warn('No context found. Returning fallback.');
        return {
          answer: "I don't have that information in my system. Would you like me to connect you to a human agent?",
          sources: [],
        };
      }

      const prompt = `
You are the official AI Travel Assistant for Ebony Bruce Travels.
Your job is to answer customer questions accurately using ONLY the information provided in the "Context" below.

=== CRITICAL RULES (STRICTLY ENFORCE) ===
1. NEVER invent prices, availability, delivery dates, admission outcomes, visa outcomes, or booking confirmations.
2. If the exact answer is not contained in the Context, you must say exactly: "I don't have that information. Would you like me to connect you to a human agent?"
3. Do NOT provide immigration or visa representation. Tell the user we only provide educational consulting.
4. Be polite, professional, and concise.
5. IF the user explicitly asks for a "human", "agent", "representative", or "person", you MUST reply with EXACTLY this phrase: "I will transfer you to a human agent now. Please hold on." (Do not add any other text).

=== KNOWLEDGE BASE CONTEXT ===
${context}
===============================

User Question:
${question}
`;

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
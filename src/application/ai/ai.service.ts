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
    });

    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey: process.env.GOOGLE_AI_API_KEY,
      temperature: 0.2, // Keep it low so it sticks strictly to your website facts
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

      // 1. Split the text into manageable chunks (1000 chars, with 100 chars overlap)
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
      });
      const chunks = await splitter.splitText(text);

      // 2. Loop through chunks, create embeddings, and insert into Supabase
      let insertedCount = 0;
      for (const chunk of chunks) {
        // Generate the vector (array of numbers) for this chunk
        const embedding = await this.embeddings.embedQuery(chunk);

        // Save to Supabase 'documents' table
        const { error } = await this.supabase.from('documents').insert({
          content: chunk,
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
  async ask(question: string) {
    try {
      // ✅ FIX: Extract the actual question to search Supabase with.
      // If the frontend sent history, it looks like: "Previous conversation:\n...\nUser: <actual question>"
      const lines = question.split('\n');
      const actualQuestion = lines[lines.length - 1].replace(/^User:\s*/i, '').trim();

      this.logger.log(`User asked: ${actualQuestion}`);

      // 1. Convert the actual question into a vector
      const queryEmbedding = await this.embeddings.embedQuery(actualQuestion);

      // 2. Search Supabase for the 5 most relevant text chunks
      const { data: matches, error } = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Adjust this if the AI is giving bad answers
        match_count: 5,
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
      // Note: We pass the ENTIRE 'question' here (which includes the history from the frontend)
      // so Gemini can understand follow-up context.
      const prompt = `
You are the official AI Travel Assistant for Ebony Bruce Travels.
Your job is to answer customer questions accurately using ONLY the information provided in the "Context" below.

RULES:
- Do NOT make up answers.
- If the answer is not contained in the Context, you must say exactly: "I don't have that information. Would you like me to connect you to a human agent?"
- Be polite and concise.

--- CONTEXT (WEBSITE INFORMATION) ---
${context}
------------------------------------

${question}
`;

      // 5. Ask Gemini
      const response = await this.llm.invoke(prompt);

      return {
        answer: response.content,
        // We return the sources so the frontend can see where it got the info
        sources: matches?.map((m: any) => m.metadata?.source) || [],
      };
    } catch (error: any) {
      this.logger.error(`Ask AI failed: ${error.message}`);
      // Fallback response if the API crashes
      return {
        answer: "I'm having trouble connecting right now. Would you like me to connect you to a human agent?",
        sources: [],
      };
    }
  }
}
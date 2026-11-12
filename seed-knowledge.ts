// 👇 Correct path based on your new screenshot
import { AiService } from './src/application/ai/ai.service'; 

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load your .env variables
dotenv.config();

async function bootstrap() {
  console.log('⏳ Initializing AI Service directly...');
  
  // We instantiate AiService manually. No NestJS, no Prisma, no Database!
  const aiService = new AiService();

  try {
    // 1. Read the markdown file. 
    const kbPath = path.join(__dirname, 'knowledge', 'ebony-bruce-kb.md');
    
    if (!fs.existsSync(kbPath)) {
      throw new Error(`Could not find the knowledge base file at: ${kbPath}. Make sure the 'knowledge' folder is in the root directory.`);
    }
    
    const knowledgeText = fs.readFileSync(kbPath, 'utf-8');

    console.log('🚀 Starting ingestion to Supabase...');
    
    // 2. Pass the file content to the ingestion method
    const result = await aiService.ingestText(
      knowledgeText, 
      'https://www.ebonybrucetravels.com/'
    );
    
    console.log('✅ Ingestion Complete!');
    console.log(`Total chunks stored: ${result.chunksStored}`);
    
  } catch (error) {
    console.error('❌ Ingestion Failed:', error);
  } finally {
    process.exit(0);
  }
}

bootstrap();
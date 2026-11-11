import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from '../../application/ai/ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ingest')
  async ingest(@Body() body: { text: string; sourceUrl: string }) {
    return this.aiService.ingestText(body.text, body.sourceUrl);
  }

  @Post('ask')
  async ask(@Body() body: { question: string }) {
    return this.aiService.ask(body.question);
  }
}
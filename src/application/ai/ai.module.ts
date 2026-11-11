import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from '../../presentation/ai/ai.controller';

@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
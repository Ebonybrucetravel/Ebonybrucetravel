import { Module } from '@nestjs/common';
import { MarkupCalculationService } from './services/markup-calculation.service';

@Module({
  providers: [MarkupCalculationService],
  exports: [MarkupCalculationService],
})
export class MarkupModule {}

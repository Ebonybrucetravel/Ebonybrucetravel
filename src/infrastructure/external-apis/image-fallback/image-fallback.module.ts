import { Module } from '@nestjs/common';
import { ImageFallbackService } from './image-fallback.service';

@Module({
  providers: [ImageFallbackService],
  exports: [ImageFallbackService],
})
export class ImageFallbackModule {}


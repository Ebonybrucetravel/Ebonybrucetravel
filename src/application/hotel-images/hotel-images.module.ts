import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { GooglePlacesModule } from '@infrastructure/external-apis/google-places/google-places.module';
import { CloudinaryModule } from '@infrastructure/cloudinary/cloudinary.module';
import { UsageTrackingModule } from '@infrastructure/usage-tracking/usage-tracking.module';
import { ImageFallbackModule } from '@infrastructure/external-apis/image-fallback/image-fallback.module';
import { HotelImageCacheService } from './hotel-image-cache.service';
import { CleanupHotelImagesJob } from './cleanup-hotel-images.job';

@Module({
  imports: [
    DatabaseModule,
    GooglePlacesModule,
    CloudinaryModule,
    UsageTrackingModule,
    ImageFallbackModule,
  ],
  providers: [HotelImageCacheService, CleanupHotelImagesJob],
  exports: [HotelImageCacheService],
})
export class HotelImagesModule {}


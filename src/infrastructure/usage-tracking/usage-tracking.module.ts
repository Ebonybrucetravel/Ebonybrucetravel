import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { UsageTrackingService } from './usage-tracking.service';

@Module({
  imports: [DatabaseModule],
  providers: [UsageTrackingService],
  exports: [UsageTrackingService],
})
export class UsageTrackingModule {}


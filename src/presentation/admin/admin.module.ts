import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { LoyaltyModule } from '@domains/loyalty/loyalty.module';
import { RewardsAdminService } from '@domains/loyalty/rewards-admin.service';
import { BookingApplicationModule } from '@application/booking/booking-application.module';

@Module({
  imports: [DatabaseModule, LoyaltyModule, BookingApplicationModule],
  controllers: [AdminController],
  providers: [RewardsAdminService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { LoyaltyModule } from '@domains/loyalty/loyalty.module';
import { RewardsAdminService } from '@domains/loyalty/rewards-admin.service';
import { BookingApplicationModule } from '@application/booking/booking-application.module';
import { AuthModule } from '@presentation/auth/auth.module';
import { PermissionsGuard } from '@common/guards/permissions.guard';

@Module({
  imports: [DatabaseModule, LoyaltyModule, BookingApplicationModule, AuthModule],
  controllers: [AdminController],
  providers: [RewardsAdminService, PermissionsGuard],
})
export class AdminModule {}

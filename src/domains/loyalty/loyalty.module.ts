import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { VoucherService } from './voucher.service';
import { DatabaseModule } from '@infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [LoyaltyService, VoucherService],
  exports: [LoyaltyService, VoucherService],
})
export class LoyaltyModule {}


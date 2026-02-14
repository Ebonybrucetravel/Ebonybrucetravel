import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { CloudinaryModule } from '@infrastructure/cloudinary/cloudinary.module';
import { LoyaltyModule } from '@domains/loyalty/loyalty.module';
import { PaymentModule } from '@domains/payment/payment.module';
import { SavedItemsModule } from '@domains/saved-items/saved-items.module';
import { SavedTravelersModule } from '@domains/saved-travelers/saved-travelers.module';

@Module({
  imports: [
    DatabaseModule,
    CloudinaryModule,
    LoyaltyModule,
    PaymentModule,
    SavedItemsModule,
    SavedTravelersModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

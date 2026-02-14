import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LoyaltyTransactionType, ProductType } from '@prisma/client';

export class RedeemPointsDto {
  @ApiProperty({ example: 'clx_reward_rule_id', description: 'Reward rule ID to redeem' })
  @IsString()
  @IsNotEmpty()
  rewardRuleId: string;
}

export class TransactionHistoryQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: LoyaltyTransactionType })
  @IsOptional()
  @IsEnum(LoyaltyTransactionType)
  type?: LoyaltyTransactionType;
}

export class SetupIntentResponseDto {
  @ApiProperty({ example: 'seti_xxx_secret_yyy' })
  clientSecret: string;

  @ApiProperty({ example: 'seti_xxx' })
  setupIntentId: string;
}

export class ConfirmPaymentMethodDto {
  @ApiProperty({ example: 'seti_xxx', description: 'Stripe SetupIntent ID' })
  @IsString()
  @IsNotEmpty()
  setupIntentId: string;

  @ApiPropertyOptional({ example: 'JOHN DOE', description: 'Cardholder name for display' })
  @IsOptional()
  @IsString()
  cardholderName?: string;
}

export class ValidateVoucherDto {
  @ApiProperty({ example: 'EBT-V-A1B2C3D4', description: 'Voucher code to validate' })
  @IsString()
  @IsNotEmpty()
  voucherCode: string;

  @ApiProperty({ enum: ProductType, example: 'FLIGHT_INTERNATIONAL', description: 'Product type for the booking' })
  @IsEnum(ProductType)
  productType: ProductType;

  @ApiProperty({ example: 500.0, description: 'Booking amount before voucher discount' })
  @IsNumber()
  @Min(0)
  bookingAmount: number;

  @ApiProperty({ example: 'USD', description: 'Booking currency (ISO 4217)' })
  @IsString()
  @IsNotEmpty()
  currency: string;
}


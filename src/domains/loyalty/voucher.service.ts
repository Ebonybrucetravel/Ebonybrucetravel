import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { VoucherStatus, ProductType } from '@prisma/client';

export interface VoucherValidationResult {
  isValid: boolean;
  voucher?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    currency?: string;
    maxDiscountAmount?: number;
    applicableProducts?: string[];
    minBookingAmount?: number;
  };
  error?: string;
}

export interface VoucherDiscountCalculation {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  voucherCode: string;
  voucherId: string;
}

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a voucher code for use
   * Checks: existence, status, expiry, ownership, applicability
   */
  async validateVoucher(
    voucherCode: string,
    userId: string,
    productType: ProductType,
    bookingAmount: number,
    currency: string,
  ): Promise<VoucherValidationResult> {
    // Find voucher
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: voucherCode },
      include: { rewardRule: true },
    });

    if (!voucher) {
      return {
        isValid: false,
        error: 'Voucher code not found',
      };
    }

    // Check ownership
    if (voucher.userId !== userId) {
      return {
        isValid: false,
        error: 'This voucher does not belong to you',
      };
    }

    // Check status
    if (voucher.status !== 'ACTIVE') {
      return {
        isValid: false,
        error: `Voucher is ${voucher.status.toLowerCase()}`,
      };
    }

    // Check expiry
    if (new Date() > voucher.expiresAt) {
      // Auto-update status
      await this.prisma.voucher.update({
        where: { id: voucher.id },
        data: { status: 'EXPIRED' },
      });
      return {
        isValid: false,
        error: 'Voucher has expired',
      };
    }

    // Check minimum booking amount
    if (voucher.minBookingAmount && bookingAmount < voucher.minBookingAmount.toNumber()) {
      return {
        isValid: false,
        error: `Minimum booking amount of ${voucher.minBookingAmount} ${voucher.currency || currency} required`,
      };
    }

    // Check product type applicability
    if (voucher.applicableProducts) {
      const applicableProducts = voucher.applicableProducts as string[];
      if (!applicableProducts.includes(productType)) {
        return {
          isValid: false,
          error: `This voucher is not applicable to ${productType.replace('_', ' ').toLowerCase()} bookings`,
        };
      }
    }

    // Check currency match (for fixed amount discounts)
    if (voucher.discountType === 'FIXED_AMOUNT' && voucher.currency && voucher.currency !== currency) {
      return {
        isValid: false,
        error: `This voucher is only valid for ${voucher.currency} bookings`,
      };
    }

    return {
      isValid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue.toNumber(),
        currency: voucher.currency || undefined,
        maxDiscountAmount: voucher.maxDiscountAmount ? voucher.maxDiscountAmount.toNumber() : undefined,
        applicableProducts: voucher.applicableProducts as string[] | undefined,
        minBookingAmount: voucher.minBookingAmount ? voucher.minBookingAmount.toNumber() : undefined,
      },
    };
  }

  /**
   * Calculate discount amount for a voucher
   */
  calculateDiscount(
    voucher: {
      discountType: string;
      discountValue: number;
      currency?: string;
      maxDiscountAmount?: number;
    },
    bookingAmount: number,
    bookingCurrency: string,
  ): number {
    let discountAmount = 0;

    if (voucher.discountType === 'PERCENTAGE') {
      discountAmount = (bookingAmount * voucher.discountValue) / 100;
      // Apply max discount cap if set
      if (voucher.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, voucher.maxDiscountAmount);
      }
    } else if (voucher.discountType === 'FIXED_AMOUNT') {
      // For fixed amount, currency must match (validated earlier)
      discountAmount = voucher.discountValue;
    }

    // Ensure discount doesn't exceed booking amount
    discountAmount = Math.min(discountAmount, bookingAmount);

    return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Apply voucher to a booking amount
   * Returns the discount calculation
   */
  async applyVoucher(
    voucherCode: string,
    userId: string,
    productType: ProductType,
    bookingAmount: number,
    currency: string,
  ): Promise<VoucherDiscountCalculation> {
    // Validate voucher
    const validation = await this.validateVoucher(voucherCode, userId, productType, bookingAmount, currency);

    if (!validation.isValid || !validation.voucher) {
      throw new BadRequestException(validation.error || 'Invalid voucher');
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(validation.voucher, bookingAmount, currency);
    const finalAmount = bookingAmount - discountAmount;

    if (finalAmount < 0) {
      throw new BadRequestException('Voucher discount exceeds booking amount');
    }

    return {
      originalAmount: bookingAmount,
      discountAmount,
      finalAmount,
      currency,
      voucherCode: validation.voucher.code,
      voucherId: validation.voucher.id,
    };
  }

  /**
   * Mark voucher as used after successful payment
   */
  async markVoucherAsUsed(voucherId: string, bookingId: string): Promise<void> {
    await this.prisma.voucher.update({
      where: { id: voucherId },
      data: {
        status: 'USED',
        usedAt: new Date(),
        usedOnBookingId: bookingId,
      },
    });

    this.logger.log(`Voucher ${voucherId} marked as used for booking ${bookingId}`);
  }

  /**
   * Get voucher details (for display)
   */
  async getVoucherDetails(voucherCode: string, userId: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: voucherCode },
      include: { rewardRule: { select: { name: true, description: true } } },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (voucher.userId !== userId) {
      throw new BadRequestException('This voucher does not belong to you');
    }

    return {
      id: voucher.id,
      code: voucher.code,
      rewardName: voucher.rewardRule.name,
      rewardDescription: voucher.rewardRule.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue.toNumber(),
      currency: voucher.currency,
      maxDiscountAmount: voucher.maxDiscountAmount ? voucher.maxDiscountAmount.toNumber() : null,
      applicableProducts: voucher.applicableProducts,
      minBookingAmount: voucher.minBookingAmount ? voucher.minBookingAmount.toNumber() : null,
      status: voucher.status,
      expiresAt: voucher.expiresAt,
      usedAt: voucher.usedAt,
      usedOnBookingId: voucher.usedOnBookingId,
      createdAt: voucher.createdAt,
    };
  }
}


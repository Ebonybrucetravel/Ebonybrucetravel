import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { EncryptionService } from '@infrastructure/security/encryption.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateCarRentalBookingDto } from '@presentation/booking/dto/create-car-rental-booking.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class CreateCarRentalBookingUseCase {
  private readonly logger = new Logger(CreateCarRentalBookingUseCase.name);

  constructor(
    private readonly amadeusService: AmadeusService,
    private readonly bookingService: BookingService,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly markupRepository: MarkupRepository,
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: CreateCarRentalBookingDto, userId: string) {
    try {
      // Get active markup config
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        'CAR_RENTAL',
        dto.currency,
      );

      if (!markupConfig) {
        throw new NotFoundException(
          `No active markup configuration found for CAR_RENTAL in ${dto.currency}`,
        );
      }

      // Calculate pricing
      const pricing = this.markupCalculationService.calculateTotal(
        dto.offerPrice,
        'CAR_RENTAL',
        dto.currency,
        markupConfig,
      );

      // Encrypt payment card details
      const encryptedCardDetails = this.encryptionService.encrypt(
        JSON.stringify({
          vendorCode: dto.payment.paymentCard.vendorCode,
          cardNumber: dto.payment.paymentCard.cardNumber,
          expiryDate: dto.payment.paymentCard.expiryDate,
          holderName: dto.payment.paymentCard.holderName,
          securityCode: dto.payment.paymentCard.securityCode,
        }),
      );

      // Create booking in database (status: PENDING, waiting for payment)
      const booking = await this.bookingService.createBooking({
        userId,
        productType: 'CAR_RENTAL',
        provider: 'AMADEUS',
        basePrice: pricing.basePrice,
        markupAmount: pricing.markupAmount,
        serviceFee: pricing.serviceFee,
        totalAmount: pricing.totalAmount,
        currency: dto.currency,
        bookingData: {
          amadeus_offer_id: dto.offerId,
          offer_price: dto.offerPrice,
          driver: dto.driver,
          payment_card_info: {
            encrypted: encryptedCardDetails,
            vendorCode: dto.payment.paymentCard.vendorCode,
            cardLast4: dto.payment.paymentCard.cardNumber.slice(-4),
            expiryDate: dto.payment.paymentCard.expiryDate,
            holderName: dto.payment.paymentCard.holderName,
          },
          special_requests: dto.specialRequests,
        },
        passengerInfo: {
          firstName: dto.driver.firstName,
          lastName: dto.driver.lastName,
          email: dto.driver.email,
          phone: dto.driver.phone,
        },
        status: BookingStatus.PENDING,
        paymentStatus: 'PENDING',
      });

      this.logger.log(`Car rental booking created: ${booking.id} (${booking.reference})`);

      return {
        booking,
        message: 'Booking created. Please proceed to payment.',
      };
    } catch (error) {
      this.logger.error('Error creating car rental booking:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create car rental booking',
      );
    }
  }

  /**
   * Create Amadeus transfer order after payment succeeds
   * Called automatically by Stripe webhook handler
   */
  async createAmadeusOrderAfterPayment(bookingId: string): Promise<{ orderId: string; orderData: any }> {
    const booking = await this.bookingService.getBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.provider !== 'AMADEUS' || booking.productType !== 'CAR_RENTAL') {
      throw new BadRequestException('This booking is not an Amadeus car rental booking');
    }

    if (booking.providerBookingId) {
      this.logger.warn(`Booking ${bookingId} already has an Amadeus order: ${booking.providerBookingId}`);
      return {
        orderId: booking.providerBookingId,
        orderData: booking.providerData as any,
      };
    }

    const bookingData = booking.bookingData as any;

    // Decrypt card details
    let cardDetails: {
      vendorCode: string;
      cardNumber: string;
      expiryDate: string;
      holderName: string;
      securityCode: string;
    };

    try {
      cardDetails = JSON.parse(this.encryptionService.decrypt(bookingData.payment_card_info.encrypted));
    } catch (error) {
      this.logger.error(`Failed to decrypt card details for booking ${bookingId}:`, error);
      throw new BadRequestException('Failed to decrypt card details. Booking cannot be completed.');
    }

    // Create Amadeus transfer order
    const amadeusOrder = await this.amadeusService.createTransferBooking({
      offerId: bookingData.amadeus_offer_id,
      passengers: [
        {
          name: {
            title: bookingData.driver.title,
            firstName: bookingData.driver.firstName,
            lastName: bookingData.driver.lastName,
          },
          contact: {
            phone: bookingData.driver.phone,
            email: bookingData.driver.email,
          },
        },
      ],
      payments: [
        {
          method: 'CREDIT_CARD',
          card: {
            vendorCode: cardDetails.vendorCode,
            cardNumber: cardDetails.cardNumber,
            expiryDate: cardDetails.expiryDate,
          },
        },
      ],
    });

    // Update booking with Amadeus order ID and clear encrypted card data
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        providerBookingId: amadeusOrder.data.id,
        providerData: amadeusOrder.data,
        status: BookingStatus.CONFIRMED,
        // Clear encrypted card data after successful booking (security best practice)
        bookingData: {
          ...bookingData,
          payment_card_info: {
            ...bookingData.payment_card_info,
            encrypted: null, // Remove encrypted data after use
            cardLast4: bookingData.payment_card_info.cardLast4, // Keep last 4 for display
          },
        },
      },
    });

    this.logger.log(`Successfully created Amadeus transfer order ${amadeusOrder.data.id} for booking ${bookingId}`);

    return {
      orderId: amadeusOrder.data.id,
      orderData: amadeusOrder.data,
    };
  }
}


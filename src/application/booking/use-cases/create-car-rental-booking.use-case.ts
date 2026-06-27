import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { EncryptionService } from '@infrastructure/security/encryption.service';
import { AgencyCardService } from '@infrastructure/security/agency-card.service';
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
    private readonly agencyCardService: AgencyCardService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: CreateCarRentalBookingDto, userId: string) {
    // ✅ Validate required fields
    if (!dto.offerPrice || dto.offerPrice <= 0) {
      this.logger.error(`Invalid offerPrice: ${dto.offerPrice}`);
      throw new BadRequestException('Offer price is required and must be greater than 0');
    }

    if (!dto.offerId) {
      throw new BadRequestException('Offer ID is required');
    }

    if (!dto.driver) {
      throw new BadRequestException('Driver information is required');
    }

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

      // ✅ Calculate pricing (includes markup + service fee)
      const pricing = this.markupCalculationService.calculateTotal(
        dto.offerPrice,
        'CAR_RENTAL',
        dto.currency,
        markupConfig,
      );

      this.logger.log(`💰 Car rental pricing: Base=${dto.offerPrice}, Markup=${pricing.markupAmount}, Service=${pricing.serviceFee}, Total=${pricing.totalAmount}`);

      // ✅ NO PAYMENT CARD REQUIRED - Same as Duffel, Wakanow, Amadeus hotels
      // Payment will be handled by Stripe webhook

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

      this.logger.log(`✅ Car rental booking created: ${booking.id} (${booking.reference})`);

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
    this.logger.log(`Creating Amadeus transfer order for booking ${bookingId}`);

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

    // ✅ Use test card for Amadeus transfer (same as Duffel, Wakanow, Amadeus hotels)
    const cardDetails = {
      vendorCode: 'VI',
      cardNumber: '4111111111111111',
      expiryDate: '2026-12',
      holderName: 'Test Card',
      securityCode: '123',
    };

    this.logger.log('Using test card for Amadeus transfer');

    // Validate offer ID
    if (!bookingData.amadeus_offer_id) {
      throw new BadRequestException('Missing offer ID for car rental booking');
    }

    // Create Amadeus transfer order
    const driverTitle = bookingData.driver?.title || 'MR';
    const amadeusOrder = await this.amadeusService.createTransferBooking({
      offerId: bookingData.amadeus_offer_id,
      passengers: [
        {
          name: {
            title: driverTitle,
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

    this.logger.log(`✅ Amadeus transfer order created: ${amadeusOrder.data.id}`);

    // Update booking with order details
    const updatedBookingData = { ...bookingData };
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        providerBookingId: amadeusOrder.data.id,
        providerData: amadeusOrder.data,
        status: BookingStatus.CONFIRMED,
        bookingData: updatedBookingData,
      },
    });

    this.logger.log(`✅ Successfully created Amadeus transfer order ${amadeusOrder.data.id} for booking ${bookingId}`);

    return {
      orderId: amadeusOrder.data.id,
      orderData: amadeusOrder.data,
    };
  }
}
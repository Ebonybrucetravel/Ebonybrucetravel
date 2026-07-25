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
    if (!dto.offerId) {
      throw new BadRequestException('Offer ID is required');
    }

    if (!dto.passengers || dto.passengers.length === 0) {
      throw new BadRequestException('At least one passenger is required');
    }

    // ✅ Validate passenger has required fields
    const firstPassenger = dto.passengers[0];
    if (!firstPassenger.name?.firstName || !firstPassenger.name?.lastName) {
      throw new BadRequestException('Passenger first name and last name are required');
    }
    if (!firstPassenger.contact?.email || !firstPassenger.contact?.phone) {
      throw new BadRequestException('Passenger email and phone are required');
    }

    // ✅ Validate offer price
    if (!dto.offerPrice || dto.offerPrice <= 0) {
      this.logger.error(`Invalid offerPrice: ${dto.offerPrice}`);
      throw new BadRequestException('Offer price is required and must be greater than 0');
    }

    if (!dto.currency) {
      throw new BadRequestException('Currency is required');
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

      // Calculate pricing
      const pricing = this.markupCalculationService.calculateTotal(
        dto.offerPrice,
        'CAR_RENTAL',
        dto.currency,
        markupConfig,
      );

      // ✅ Prepare booking data
      const bookingData = {
        amadeus_offer_id: dto.offerId,
        offer_price: dto.offerPrice,
        passengers: dto.passengers,
        special_requests: dto.specialRequests,
        flight_number: dto.flightNumber,
        billing_address: dto.billingAddress,
        payment_method: dto.payment?.methodOfPayment || 'CREDIT_CARD',
        transfer_type: dto.transferType || 'PRIVATE',
      };

      // ✅ Get first passenger for booking reference
      const primaryPassenger = dto.passengers[0];

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
        bookingData: bookingData,
        passengerInfo: {
          firstName: primaryPassenger.name.firstName,
          lastName: primaryPassenger.name.lastName,
          email: primaryPassenger.contact.email,
          phone: primaryPassenger.contact.phone,
        },
        status: BookingStatus.PENDING,
        paymentStatus: 'PENDING',
      });

      this.logger.log(`✅ Car rental booking created: ${booking.id} (${booking.reference})`);

      // ✅ If payment is provided, create Amadeus order immediately
      if (dto.payment && dto.payment.methodOfPayment === 'CREDIT_CARD' && dto.payment.creditCard) {
        try {
          this.logger.log('Payment details provided, creating Amadeus order immediately...');
          const { orderId, orderData } = await this.createAmadeusOrderAfterPayment(
            booking.id,
            dto.payment,
          );
          
          // Update booking with order details
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              providerBookingId: orderId,
              providerData: orderData,
              status: BookingStatus.CONFIRMED,
            },
          });

          // ✅ Fetch updated booking
          const updatedBooking = await this.bookingService.getBookingById(booking.id);

          return {
            booking: updatedBooking,
            message: 'Booking confirmed. Order created successfully.',
          };
        } catch (error) {
          this.logger.error('Failed to create Amadeus order immediately:', error);
          // Booking remains PENDING - will be processed by webhook
        }
      }

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
  async createAmadeusOrderAfterPayment(
    bookingId: string,
    payment?: CreateCarRentalBookingDto['payment'],
  ): Promise<{ orderId: string; orderData: any }> {
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

    // ✅ Validate offer ID
    if (!bookingData.amadeus_offer_id) {
      throw new BadRequestException('Missing offer ID for car rental booking');
    }

    // ✅ Build passenger data for Amadeus API
    const passengers = bookingData.passengers.map((p: any, index: number) => ({
      id: (index + 1).toString(), // ✅ Required by Amadeus API
      name: {
        title: p.name.title || 'MR',
        firstName: p.name.firstName,
        lastName: p.name.lastName,
      },
      contact: {
        phoneNumber: p.contact.phone,
        email: p.contact.email,
      },
    }));

    // ✅ Build payment data
    let paymentData = null;
    if (payment) {
      paymentData = {
        methodOfPayment: payment.methodOfPayment,
      };

      if (payment.methodOfPayment === 'CREDIT_CARD' && payment.creditCard) {
        paymentData.creditCard = {
          vendorCode: payment.creditCard.vendorCode || 'VI',
          cardNumber: payment.creditCard.number,
          holderName: payment.creditCard.holderName,
          expiryDate: payment.creditCard.expiryDate,
          cvv: payment.creditCard.cvv,
        };
      } else if (payment.methodOfPayment === 'INVOICE') {
        paymentData.paymentReference = payment.paymentReference;
      }
    } else {
      // ✅ Fallback: Use test card if no payment provided
      this.logger.log('No payment provided, using test card');
      paymentData = {
        methodOfPayment: 'CREDIT_CARD',
        creditCard: {
          vendorCode: 'VI',
          cardNumber: '4111111111111111',
          holderName: 'Test Card',
          expiryDate: '1226',
          cvv: '123',
        },
      };
    }

    // ✅ Build request for Amadeus API
    const requestParams: any = {
      offerId: bookingData.amadeus_offer_id,
      passengers: passengers,
      payment: paymentData,
    };

    // ✅ Add billing address if provided
    if (bookingData.billing_address) {
      requestParams.billingAddress = {
        line: bookingData.billing_address.line,
        zip: bookingData.billing_address.zip,
        cityName: bookingData.billing_address.cityName,
        countryCode: bookingData.billing_address.countryCode,
      };
    }

    // ✅ Add flight number if provided
    if (bookingData.flight_number) {
      requestParams.flightNumber = bookingData.flight_number;
    }

    // ✅ Add special requests if provided
    if (bookingData.special_requests) {
      requestParams.specialRequests = bookingData.special_requests;
    }

    this.logger.log(`Creating Amadeus transfer order with params: ${JSON.stringify(requestParams, null, 2)}`);

    // ✅ Create Amadeus transfer order
    const amadeusOrder = await this.amadeusService.createTransferBooking(requestParams);

    if (!amadeusOrder?.data?.id) {
      this.logger.error(`Amadeus response missing order ID: ${JSON.stringify(amadeusOrder)}`);
      throw new BadRequestException('Failed to create Amadeus transfer order: No order ID returned');
    }

    this.logger.log(`✅ Amadeus transfer order created: ${amadeusOrder.data.id}`);

    // ✅ Extract transfer information
    const transfer = amadeusOrder.data.transfers?.[0];
    const confirmNbr = transfer?.confirmNbr || null;

    // ✅ Update booking with order details
    const updatedBookingData = { 
      ...bookingData,
      confirmNbr: confirmNbr, // ✅ Store confirmation number in bookingData
    };

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

  /**
   * Cancel Amadeus transfer order
   */
  async cancelAmadeusOrder(bookingId: string): Promise<any> {
    this.logger.log(`Cancelling Amadeus transfer order for booking ${bookingId}`);

    const booking = await this.bookingService.getBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (!booking.providerBookingId) {
      throw new BadRequestException('No Amadeus order found for this booking');
    }

    // ✅ Get confirmation number from bookingData (for logging only)
    const bookingData = booking.bookingData as any;
    const confirmNbr = bookingData?.confirmNbr;

    if (!confirmNbr) {
      this.logger.warn('No confirmation number found, attempting cancellation without it');
    }

    // ✅ Cancel in Amadeus - only pass the orderId (1 argument)
    const result = await this.amadeusService.cancelTransfer(booking.providerBookingId);

    // Update booking status
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
      },
    });

    this.logger.log(`✅ Amadeus transfer order cancelled for booking ${bookingId}`);

    return result;
  }
}
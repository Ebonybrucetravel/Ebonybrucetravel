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

    if (!dto.offerId) {
      throw new BadRequestException('Offer ID is required');
    }

    if (!dto.passengers || dto.passengers.length === 0) {
      throw new BadRequestException('At least one passenger is required');
    }

    const firstPassenger = dto.passengers[0];
    if (!firstPassenger.name?.firstName || !firstPassenger.name?.lastName) {
      throw new BadRequestException('Passenger first name and last name are required');
    }
    if (!firstPassenger.contact?.email || !firstPassenger.contact?.phone) {
      throw new BadRequestException('Passenger email and phone are required');
    }

    if (!dto.flightNumber) {
      throw new BadRequestException('Flight number is required for car rental transfers');
    }
    if (!dto.flightDate) {
      throw new BadRequestException('Flight date is required for car rental transfers');
    }

    let offerPrice = dto.offerPrice;
    let currency = dto.currency;

    if (dto.priceBreakdown) {
      offerPrice = dto.priceBreakdown.basePrice || dto.priceBreakdown.totalAmount;
      currency = dto.priceBreakdown.currency || dto.currency;
    }

    if (!offerPrice || offerPrice <= 0) {
      this.logger.error(`Invalid offerPrice: ${offerPrice}`);
      throw new BadRequestException('Offer price is required and must be greater than 0');
    }

    if (!currency) {
      throw new BadRequestException('Currency is required');
    }

    try {
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        'CAR_RENTAL',
        currency,
      );

      if (!markupConfig) {
        throw new NotFoundException(
          `No active markup configuration found for CAR_RENTAL in ${currency}`,
        );
      }

      const pricing = this.markupCalculationService.calculateTotal(
        offerPrice,
        'CAR_RENTAL',
        currency,
        markupConfig,
      );


      const bookingData = {
        amadeus_offer_id: dto.offerId,
        offer_price: offerPrice,
        passengers: dto.passengers,
        special_requests: dto.specialRequests,
          flight_number: dto.flightNumber,
  flight_date: dto.flightDate,
  airline_code: dto.airlineCode,
  flight_time: dto.flightTime,
  pickup_location: dto.pickupLocation,
dropoff_location: dto.dropoffLocation,
  billing_address: dto.billingAddress,
  payment_method: dto.payment?.methodOfPayment || 'CREDIT_CARD',
  transfer_type: dto.transferType || 'PRIVATE',
};
      const primaryPassenger = dto.passengers[0];

      const booking = await this.bookingService.createBooking({
        userId,
        productType: 'CAR_RENTAL',
        provider: 'AMADEUS',
        basePrice: pricing.basePrice,
        markupAmount: pricing.markupAmount,
        serviceFee: pricing.serviceFee,
        taxes: pricing.taxAmount,
        taxPercentage: pricing.taxPercentage,
        totalAmount: pricing.totalAmount,
        currency,
        bookingData,
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

      if (dto.payment && dto.payment.methodOfPayment === 'CREDIT_CARD' && dto.payment.creditCard) {
        try {
          this.logger.log('Payment details provided, creating Amadeus order immediately...');
          const { orderId, orderData } = await this.createAmadeusOrderAfterPayment(
            booking.id,
            dto.payment,
          );
          
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              providerBookingId: orderId,
              providerData: orderData,
              status: BookingStatus.CONFIRMED,
            },
          });


          const updatedBooking = await this.bookingService.getBookingById(booking.id);
          if (!updatedBooking) {
            throw new NotFoundException(`Booking ${booking.id} not found after update`);
          }

          return {
            booking: updatedBooking,
            message: 'Booking confirmed. Order created successfully.',
          };
        } catch (error) {
          this.logger.error('Failed to create Amadeus order immediately:', error);
         
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
  
    if (!bookingData.amadeus_offer_id) {
      throw new BadRequestException('Missing offer ID for car rental booking');
    }
  
    if (!bookingData.flight_number) {
      throw new BadRequestException(
        'Flight number is required for car rental transfer booking. ' +
        'Please provide your flight number.'
      );
    }
  
    if (!bookingData.flight_date) {
      throw new BadRequestException(
        'Flight date is required for car rental transfer booking. ' +
        'Please provide your flight date.'
      );
    }
  
    let passengers = [];
    
    if (bookingData.passengers && Array.isArray(bookingData.passengers) && bookingData.passengers.length > 0) {
      passengers = bookingData.passengers;
    } 
  
    else if (bookingData.driver) {
      const driver = bookingData.driver;
      passengers = [{
        name: {
          firstName: driver.firstName || driver.name?.firstName || 'Guest',
          lastName: driver.lastName || driver.name?.lastName || 'Guest',
          title: driver.title || 'MR',
        },
        contact: {
          phone: driver.phone || 'N/A',
          email: driver.email || 'guest@example.com',
        },
      }];
    }
    else if (booking.passengerInfo) {
      const info = booking.passengerInfo as any;
      passengers = [{
        name: {
          firstName: info.firstName || 'Guest',
          lastName: info.lastName || 'Guest',
          title: info.title || 'MR',
        },
        contact: {
          phone: info.phone || 'N/A',
          email: info.email || 'guest@example.com',
        },
      }];
    }
    else {
      this.logger.warn(`⚠️ No passenger data found for booking ${bookingId}, using default`);
      passengers = [{
        name: {
          firstName: 'Guest',
          lastName: 'User',
          title: 'MR',
        },
        contact: {
          phone: 'N/A',
          email: 'guest@example.com',
        },
      }];
    }
  
    const formattedPassengers = passengers.map((p: any) => {
      const name = p.name || {};
      const contact = p.contact || {};
      
      return {
        firstName: name.firstName || 'Guest',
        lastName: name.lastName || 'User',
        title: name.title || 'MR',
        phoneNumber: contact.phone || 'N/A',
        email: contact.email || 'guest@example.com',
      };
    });
  
    this.logger.log(`✅ Found ${formattedPassengers.length} passenger(s) for booking ${bookingId}`);
  
    let paymentData = null;
    if (payment) {
      paymentData = {
        methodOfPayment: payment.methodOfPayment,
      };
  
      if (payment.methodOfPayment === 'CREDIT_CARD' && payment.creditCard) {
        paymentData.creditCard = {
          vendorCode: payment.creditCard.vendorCode || 'VI',
          number: payment.creditCard.number,
          holderName: payment.creditCard.holderName,
          expiryDate: payment.creditCard.expiryDate,
          cvv: payment.creditCard.cvv,
        };
      } else if (payment.methodOfPayment === 'INVOICE') {
        paymentData.paymentReference = payment.paymentReference;
      }
    } else {
      this.logger.log('No payment provided, using test card');
      paymentData = {
        methodOfPayment: 'CREDIT_CARD',
        creditCard: {
          vendorCode: 'VI',
          number: '4111111111111111',
          holderName: 'Test Card',
          expiryDate: '1226',
          cvv: '123',
        },
      };
    }

    const requestParams: any = {
      offerId: bookingData.amadeus_offer_id,
      passengers: formattedPassengers,
      payment: paymentData,
    };
  
    requestParams.flightNumber = bookingData.flight_number;
    requestParams.flightDate = bookingData.flight_date;

    if (bookingData.airline_code) {
      requestParams.airlineCode = bookingData.airline_code;
    }

    if (bookingData.flight_time) {
      requestParams.flightTime = bookingData.flight_time;
    }

    requestParams.pickupLocation = bookingData.pickup_location || 
                               bookingData.pickupLocation || 
                               'CDG';  // Default fallback

requestParams.dropoffLocation = bookingData.dropoff_location || 
                                bookingData.dropoffLocation || 
                                bookingData.pickup_location || 
                                'CDG';  // Default fallback

  
    if (bookingData.billing_address) {
      requestParams.billingAddress = {
        line: bookingData.billing_address.line || '',
        zip: bookingData.billing_address.zip || '',
        cityName: bookingData.billing_address.cityName || '',
        countryCode: bookingData.billing_address.countryCode || '',
      };
    }
  
    if (bookingData.special_requests) {
      requestParams.note = bookingData.special_requests;
    }
  
    if (bookingData?.agencyEmail) {
      requestParams.agencyEmail = bookingData.agencyEmail;
    }
  
    this.logger.log(`Creating Amadeus transfer order with ${formattedPassengers.length} passenger(s)`);
    this.logger.log(`Flight: ${bookingData.flight_number} on ${bookingData.flight_date}`);
    this.logger.log(`Request params: ${JSON.stringify(requestParams, null, 2)}`);
  
    const amadeusOrder = await this.amadeusService.createTransferBooking(requestParams);
  
    if (!amadeusOrder?.data?.id) {
      this.logger.error(`Amadeus response missing order ID: ${JSON.stringify(amadeusOrder)}`);
      throw new BadRequestException('Failed to create Amadeus transfer order: No order ID returned');
    }
  
    this.logger.log(`✅ Amadeus transfer order created: ${amadeusOrder.data.id}`);
  
    const transfer = amadeusOrder.data.transfers?.[0];
    const confirmNbr = transfer?.confirmNbr || null;
  
    const updatedBookingData = { 
      ...bookingData,
      confirmNbr: confirmNbr,
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
  
    this.logger.log(` Successfully created Amadeus transfer order ${amadeusOrder.data.id} for booking ${bookingId}`);
  
    return {
      orderId: amadeusOrder.data.id,
      orderData: amadeusOrder.data,
    };
  }

  async cancelAmadeusOrder(bookingId: string): Promise<any> {
    this.logger.log(`Cancelling Amadeus transfer order for booking ${bookingId}`);

    const booking = await this.bookingService.getBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (!booking.providerBookingId) {
      throw new BadRequestException('No Amadeus order found for this booking');
    }

    // ✅ Get confirmation number from bookingData
    const bookingData = booking.bookingData as any;
    const confirmNbr = bookingData?.confirmNbr;

    if (!confirmNbr) {
      this.logger.warn(`⚠️ No confirmation number found for booking ${bookingId}. Attempting cancellation anyway...`);
      throw new BadRequestException(
        'Cannot cancel booking: Missing confirmation number. Please contact support.',
      );
    }

    // ✅ Cancel in Amadeus - pass both orderId and confirmNbr
    try {
      const result = await this.amadeusService.cancelTransfer({
        orderId: booking.providerBookingId,
        confirmNbr: confirmNbr,
      });

      // ✅ Update booking status
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      this.logger.log(`✅ Amadeus transfer order cancelled for booking ${bookingId}`);

      return result;
    } catch (error: any) {
      this.logger.error(`❌ Failed to cancel Amadeus order: ${error.message}`);
      
      // ✅ Even if Amadeus cancellation fails, we can still mark as cancelled locally
      // if the error indicates the order doesn't exist anymore
      if (error.message?.includes('not found') || error.message?.includes('already cancelled')) {
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.CANCELLED,
          },
        });
        return {
          confirmNbr: confirmNbr,
          reservationStatus: 'CANCELLED',
          message: 'Booking marked as cancelled locally (Amadeus order already cancelled or not found)',
        };
      }
      
      throw error;
    }
  }

  /**
   * ✅ NEW: Get booking by reference with confirmNbr
   */
  async getBookingWithConfirmNbr(bookingId: string): Promise<{ booking: any; confirmNbr: string | null }> {
    const booking = await this.bookingService.getBookingById(bookingId);
    
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const bookingData = booking.bookingData as any;
    const confirmNbr = bookingData?.confirmNbr || null;

    return {
      booking,
      confirmNbr,
    };
  }

  /**
   * ✅ NEW: Retry Amadeus order creation for a booking
   */
  async retryAmadeusOrder(bookingId: string, payment?: CreateCarRentalBookingDto['payment']): Promise<any> {
    this.logger.log(`Retrying Amadeus order creation for booking ${bookingId}`);

    const booking = await this.bookingService.getBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.providerBookingId) {
      this.logger.warn(`Booking ${bookingId} already has an order: ${booking.providerBookingId}`);
      return {
        orderId: booking.providerBookingId,
        orderData: booking.providerData,
      };
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot create order for cancelled booking');
    }

    // ✅ Try to create order
    return this.createAmadeusOrderAfterPayment(bookingId, payment);
  }
}
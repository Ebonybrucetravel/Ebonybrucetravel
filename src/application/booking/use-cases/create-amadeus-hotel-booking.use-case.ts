import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { EncryptionService } from '@infrastructure/security/encryption.service';
import { CreateAmadeusHotelBookingDto } from '@presentation/booking/dto/create-amadeus-hotel-booking.dto';
import { BookingStatus, Provider } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class CreateAmadeusHotelBookingUseCase {
  private readonly logger = new Logger(CreateAmadeusHotelBookingUseCase.name);

  constructor(
    private readonly amadeusService: AmadeusService,
    private readonly bookingService: BookingService,
    private readonly markupRepository: MarkupRepository,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Step 1: Create local booking (before payment)
   * This stores the booking details and allows payment intent creation.
   * After payment succeeds, the actual Amadeus booking is created via webhook.
   */
  async execute(dto: CreateAmadeusHotelBookingDto, userId: string) {
    try {
      const { offerPrice, currency } = dto;

      // Get active markup config for HOTEL
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType('HOTEL', currency);

      if (!markupConfig) {
        throw new NotFoundException(`No active markup configuration found for HOTEL in ${currency}`);
      }

      // The offerPrice is already the final price (after markup and conversion)
      // We need to reverse-calculate the base price for our records
      // finalPrice = basePrice + (basePrice * markup%) + serviceFee
      // So: basePrice = (finalPrice - serviceFee) / (1 + markup%)
      const serviceFee = markupConfig.serviceFeeAmount || 0;
      const markupPercentage = markupConfig.markupPercentage || 0;
      const basePrice = (offerPrice - serviceFee) / (1 + markupPercentage / 100);

      if (basePrice <= 0) {
        throw new BadRequestException('Invalid offer price. Price must be greater than 0.');
      }

      // Calculate pricing with markup
      const pricing = this.markupCalculationService.calculateTotal(
        basePrice,
        'HOTEL',
        currency,
        markupConfig,
      );

      // Extract guest information for passengerInfo
      const leadGuest = dto.guests[0];
      const passengerInfo = {
        email: leadGuest.contact.email,
        phone: leadGuest.contact.phone,
        firstName: leadGuest.name.firstName,
        lastName: leadGuest.name.lastName,
        title: leadGuest.name.title,
        guests: dto.guests.map((guest, index) => ({
          travelerId: index + 1,
          title: guest.name.title,
          firstName: guest.name.firstName,
          lastName: guest.name.lastName,
          email: guest.contact.email,
          phone: guest.contact.phone,
        })),
      };

      // Encrypt and store payment card info securely
      // This allows us to use the card details when creating Amadeus booking after payment
      const cardDetails = {
        vendorCode: dto.payment.paymentCard.paymentCardInfo.vendorCode,
        cardNumber: dto.payment.paymentCard.paymentCardInfo.cardNumber,
        expiryDate: dto.payment.paymentCard.paymentCardInfo.expiryDate,
        holderName: dto.payment.paymentCard.paymentCardInfo.holderName,
        securityCode: dto.payment.paymentCard.paymentCardInfo.securityCode,
      };

      // Encrypt card details for secure storage
      const encryptedCardData = this.encryptionService.encryptCardDetails(cardDetails);

      // Store both encrypted data and last 4 digits for display
      const paymentCardInfo = {
        encrypted: encryptedCardData,
        cardLast4: dto.payment.paymentCard.paymentCardInfo.cardNumber.slice(-4),
        vendorCode: dto.payment.paymentCard.paymentCardInfo.vendorCode,
        expiryDate: dto.payment.paymentCard.paymentCardInfo.expiryDate,
        holderName: dto.payment.paymentCard.paymentCardInfo.holderName,
      };

      // Create booking in our database (PENDING status - waiting for payment)
      const booking = await this.bookingService.createBooking({
        userId,
        productType: 'HOTEL',
        provider: Provider.AMADEUS,
        basePrice: pricing.basePrice,
        markupAmount: pricing.markupAmount,
        serviceFee: pricing.serviceFee,
        totalAmount: pricing.totalAmount,
        currency,
        bookingData: {
          amadeus_offer_id: dto.hotelOfferId,
          room_associations: dto.roomAssociations,
          guests: dto.guests,
          payment_method: dto.payment.method,
          payment_card_info: paymentCardInfo,
          travel_agent_email: dto.travelAgentEmail,
          accommodation_special_requests: dto.accommodationSpecialRequests,
          offer_price: basePrice,
          offer_currency: currency,
        },
        passengerInfo,
        status: BookingStatus.PENDING,
        paymentStatus: 'PENDING',
      });

      this.logger.log(`Created local booking ${booking.id} for Amadeus hotel offer ${dto.hotelOfferId}`);

      return {
        booking,
        message: 'Booking created. Please proceed to payment.',
      };
    } catch (error) {
      this.logger.error('Error creating Amadeus hotel booking:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Step 2: Create actual Amadeus booking (after payment succeeds)
   * This is called from the Stripe webhook handler after payment confirmation.
   */
  async createAmadeusBookingAfterPayment(bookingId: string): Promise<{ orderId: string; orderData: any }> {
    try {
      // Get booking from database
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      if (booking.provider !== Provider.AMADEUS) {
        throw new BadRequestException('Booking is not an Amadeus booking');
      }

      if (booking.providerBookingId) {
        this.logger.warn(`Booking ${bookingId} already has Amadeus order ID: ${booking.providerBookingId}`);
        // Booking already created in Amadeus, return existing order
        const orderData = await this.amadeusService.getHotelBooking(booking.providerBookingId);
        return {
          orderId: booking.providerBookingId,
          orderData: orderData.data,
        };
      }

      const bookingData = booking.bookingData as any;
      const passengerInfo = booking.passengerInfo as any;

      if (!bookingData.amadeus_offer_id) {
        throw new BadRequestException('Booking missing Amadeus offer ID');
      }

      // Reconstruct guests from stored data
      const guests = bookingData.guests || passengerInfo.guests || [];

      // Reconstruct room associations
      const roomAssociations = bookingData.room_associations || [];

      // Decrypt card details
      if (!bookingData.payment_card_info?.encrypted) {
        throw new BadRequestException('Encrypted card details not found in booking data');
      }

      let cardDetails: {
        vendorCode: string;
        cardNumber: string;
        expiryDate: string;
        holderName?: string;
        securityCode?: string;
      };

      try {
        cardDetails = this.encryptionService.decryptCardDetails(bookingData.payment_card_info.encrypted);
      } catch (error) {
        this.logger.error(`Failed to decrypt card details for booking ${bookingId}:`, error);
        throw new BadRequestException('Failed to decrypt card details. Booking cannot be completed.');
      }

      // Create Amadeus booking
      const amadeusBooking = await this.amadeusService.createHotelBooking({
        hotelOfferId: bookingData.amadeus_offer_id,
        guests: guests.map((g: any) => ({
          title: g.name?.title || g.title,
          firstName: g.name?.firstName || g.firstName,
          lastName: g.name?.lastName || g.lastName,
          phone: g.contact?.phone || g.phone,
          email: g.contact?.email || g.email,
        })),
        roomAssociations: roomAssociations.map((ra: any) => ({
          hotelOfferId: ra.hotelOfferId,
          guestReferences: ra.guestReferences,
        })),
        payment: {
          method: 'CREDIT_CARD',
          paymentCard: {
            paymentCardInfo: {
              vendorCode: cardDetails.vendorCode,
              cardNumber: cardDetails.cardNumber,
              expiryDate: cardDetails.expiryDate,
              holderName: cardDetails.holderName,
              securityCode: cardDetails.securityCode,
            },
          },
        },
        travelAgentEmail: bookingData.travel_agent_email,
        accommodationSpecialRequests: bookingData.accommodation_special_requests,
      });

      // Update booking with Amadeus order ID
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          providerBookingId: amadeusBooking.data.id,
          providerData: amadeusBooking.data,
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

      this.logger.log(`Successfully created Amadeus hotel order ${amadeusBooking.data.id} for booking ${bookingId}`);

      return {
        orderId: amadeusBooking.data.id,
        orderData: amadeusBooking.data,
      };
    } catch (error) {
      this.logger.error(`Failed to create Amadeus booking for booking ${bookingId}:`, error);
      throw error;
    }
  }
}


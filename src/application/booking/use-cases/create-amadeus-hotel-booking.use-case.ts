import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; 
import { redactCardData } from '@common/utils/pci-redaction.util';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { EncryptionService } from '@infrastructure/security/encryption.service';
import { AgencyCardService } from '@infrastructure/security/agency-card.service';
import { CreateAmadeusHotelBookingDto } from '@presentation/booking/dto/create-amadeus-hotel-booking.dto';
import { BookingStatus, Provider } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class CreateAmadeusHotelBookingUseCase {
  private readonly logger = new Logger(CreateAmadeusHotelBookingUseCase.name);

  constructor(
    private readonly configService: ConfigService,  
    private readonly amadeusService: AmadeusService,
    private readonly bookingService: BookingService,
    private readonly markupRepository: MarkupRepository,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly encryptionService: EncryptionService,
    private readonly agencyCardService: AgencyCardService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Step 1: Create local booking (before payment)
   * This stores the booking details and allows payment intent creation.
   * After payment succeeds, the actual Amadeus booking is created via webhook.
   */
  async execute(dto: CreateAmadeusHotelBookingDto, userId: string) {
    try {
      const { 
        offerPrice, 
        currency, 
        cancellationDeadline, 
        cancellationPolicySnapshot, 
        policyAccepted, 
        clientIp, 
        userAgent,
        checkInDate,
        checkOutDate
      } = dto;

      if (!policyAccepted) {
        throw new BadRequestException(
          'You must agree to the cancellation and no-show policy before booking. Please check the box to confirm.',
        );
      }

      const deadlineUtc = new Date(cancellationDeadline);
      if (isNaN(deadlineUtc.getTime())) {
        throw new BadRequestException('Invalid cancellation deadline. Use ISO 8601 format (e.g. 2026-02-14T23:59:00.000Z).');
      }

      const markupConfig = await this.markupRepository.findActiveMarkupByProductType('HOTEL', currency);

      if (!markupConfig) {
        throw new NotFoundException(`No active markup configuration found for HOTEL in ${currency}`);
      }

      const frontendTotalAmount = typeof offerPrice === 'number' 
        ? offerPrice 
        : parseFloat(offerPrice as any || '0');

      const serviceFee = markupConfig.serviceFeeAmount || 0;
      const markupPercentage = markupConfig.markupPercentage || 0;

      const calculatedBasePrice = (frontendTotalAmount - serviceFee) / (1 + markupPercentage / 100);

      if (calculatedBasePrice <= 0) {
        throw new BadRequestException('Invalid offer price. Price must be greater than 0.');
      }

      const calculatedMarkupAmount = (calculatedBasePrice * markupPercentage) / 100;

      const pricing = {
        basePrice: calculatedBasePrice,
        markupAmount: calculatedMarkupAmount,
        serviceFee: serviceFee,
        totalAmount: frontendTotalAmount,
      };

      this.logger.log(`Price breakdown - Base: ${pricing.basePrice}, Markup: ${pricing.markupAmount}, Service Fee: ${pricing.serviceFee}, Total: ${pricing.totalAmount}`);

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

      let paymentCardInfo: any = null;
      if (dto.payment) {
        const cardDetails = {
          vendorCode: dto.payment.paymentCard.paymentCardInfo.vendorCode,
          cardNumber: dto.payment.paymentCard.paymentCardInfo.cardNumber,
          expiryDate: dto.payment.paymentCard.paymentCardInfo.expiryDate,
          holderName: dto.payment.paymentCard.paymentCardInfo.holderName,
          securityCode: dto.payment.paymentCard.paymentCardInfo.securityCode,
        };
        const encryptedCardData = this.encryptionService.encryptCardDetails(cardDetails);
        paymentCardInfo = {
          encrypted: encryptedCardData,
          cardLast4: dto.payment.paymentCard.paymentCardInfo.cardNumber.slice(-4),
          vendorCode: dto.payment.paymentCard.paymentCardInfo.vendorCode,
          expiryDate: dto.payment.paymentCard.paymentCardInfo.expiryDate,
          holderName: dto.payment.paymentCard.paymentCardInfo.holderName,
        };
      } else if (!this.agencyCardService.isMerchantModel()) {
        throw new BadRequestException(
          'Payment card is required. Omit only when PAYMENT_MODEL=merchant (customer pays via Stripe; agency pays Amadeus).',
        );
      }

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
          payment_method: dto.payment?.method ?? 'CREDIT_CARD',
          ...(paymentCardInfo && { payment_card_info: paymentCardInfo }),
          travel_agent_email: dto.travelAgentEmail,
          accommodation_special_requests: dto.accommodationSpecialRequests,
          // Customer-facing price in NGN
          offer_price: dto.offerPrice,
          frontend_total: frontendTotalAmount,
          markup_config_used: {
            markupPercentage,
            serviceFee,
            currency,
          },
          // Store the original price and currency for Amadeus
          original_offer_price: {
            currency: dto.currency,  // This should be GBP, USD, EUR
            total: dto.offerPrice.toString(),
            base: (dto.offerPrice / (1 + markupPercentage / 100)).toString(),
          },
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
        },
        passengerInfo,
        status: BookingStatus.PENDING,
        paymentStatus: 'PENDING',
        cancellationDeadline: deadlineUtc,
        cancellationPolicySnapshot: cancellationPolicySnapshot.trim(),
        policyAcceptedAt: new Date(),
        ...(clientIp && { clientIp }),
        ...(userAgent && { userAgent }),
      });

      this.logger.log(`Created local booking ${booking.id} for Amadeus hotel offer ${dto.hotelOfferId} with total amount ${pricing.totalAmount}`);
      this.logger.log(`📅 Saved dates - Check-in: ${checkInDate}, Check-out: ${checkOutDate}`);
      this.logger.log(`💰 Original price for Amadeus: ${dto.offerPrice} ${dto.currency}`);

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
        const orderData = await this.amadeusService.getHotelBooking(booking.providerBookingId);
        return {
          orderId: booking.providerBookingId,
          orderData: orderData.data,
        };
      }

      const bookingData = booking.bookingData as any;
      const passengerInfo = booking.passengerInfo as any;

      const offerId = bookingData.amadeus_offer_id || bookingData.offerId;
      if (!offerId) {
        throw new BadRequestException('Booking missing Amadeus offer ID (amadeus_offer_id or offerId)');
      }

      let guests = bookingData.guests || passengerInfo?.guests || [];
      if (guests.length === 0 && passengerInfo) {
        const p = passengerInfo;
        guests = [
          {
            title: (p as any).title || 'MR',
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            phone: p.phone || '',
          },
        ];
      }

      let roomAssociations = bookingData.room_associations || [];
      if (roomAssociations.length === 0 && guests.length > 0) {
        roomAssociations = [
          { hotelOfferId: offerId, guestReferences: [{ guestReference: '1' }] },
        ];
      }

      let cardDetails: {
        vendorCode: string;
        cardNumber: string;
        expiryDate: string;
        holderName?: string;
        securityCode?: string;
      } | null = null;

      if (bookingData.payment_card_info?.encrypted) {
        try {
          cardDetails = this.encryptionService.decryptCardDetails(bookingData.payment_card_info.encrypted);
        } catch (error) {
          this.logger.error(`Failed to decrypt card details for booking ${bookingId}`);
          throw new BadRequestException('Failed to decrypt card details. Booking cannot be completed.');
        }
      } else {
        cardDetails = this.agencyCardService.getAmadeusAgencyCard();
        if (!cardDetails) {
          throw new BadRequestException(
            'Amadeus order not created: no payment method. ' +
              'Set AMADEUS_AGENCY_CARD_ENCRYPTED and PAYMENT_MODEL=merchant, or create booking with guest payment card.',
          );
        }
      }

      // ✅ Get the original price and currency from bookingData
      const originalOfferPrice = bookingData.original_offer_price || {};
      const originalCurrency = originalOfferPrice.currency || 'GBP';
      const originalTotal = parseFloat(originalOfferPrice.total || '0');
      const originalBase = parseFloat(originalOfferPrice.base || '0');

      // ✅ Use the actual original price, not a test price
      const priceForAmadeus: any = {
        currency: originalCurrency,
        base: originalBase.toFixed(2),
        total: originalTotal.toFixed(2),
      };

      this.logger.log(`💰 Sending ORIGINAL price to Amadeus: ${JSON.stringify(priceForAmadeus)}`);
      this.logger.log(`🏨 Hotel Offer ID: ${offerId}, Currency: ${originalCurrency}, Price: ${originalTotal}`);

// ✅ FIXED: Transform guests with 'tid' field (Amadeus requirement)
const transformedGuests = guests.map((g: any, index: number) => ({
  tid: (index + 1).toString(),
  title: g.name?.title || g.title,
  firstName: g.name?.firstName || g.firstName,
  lastName: g.name?.lastName || g.lastName,
  phone: g.contact?.phone || g.phone,
  email: g.contact?.email || g.email,
}));

// ✅ CORRECTED: Build request body matching Amadeus sample (NO hotelBookings wrapper)
const amadeusRequestPayload = {
  data: {
    type: "hotel-order",
    guests: transformedGuests,
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
    travelAgent: {
      contact: {
        email: this.configService.get<string>('AMADEUS_TRAVEL_AGENT_EMAIL') || 'info@ebonybrucetravels.com',
      },
    },
    ...(bookingData.accommodation_special_requests && {
      accommodationSpecialRequests: bookingData.accommodation_special_requests,
    }),
    price: priceForAmadeus,
  }
};

this.logger.log(`📤 Sending to Amadeus: ${JSON.stringify(amadeusRequestPayload, null, 2)}`);

// Call Amadeus service
const amadeusBooking = await this.amadeusService.createHotelBooking(amadeusRequestPayload);

      const updatedBookingData = { ...bookingData };
      if (bookingData.payment_card_info) {
        updatedBookingData.payment_card_info = {
          ...bookingData.payment_card_info,
          encrypted: null,
          cardLast4: bookingData.payment_card_info.cardLast4,
        };
      }
      
      updatedBookingData.amadeus_booking_details = {
        currency_used: originalCurrency,
        price_sent: priceForAmadeus,
        hotel_offer_id: offerId,
        created_at: new Date().toISOString(),
        request_payload: amadeusRequestPayload,
      };
      
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          providerBookingId: amadeusBooking.data.id,
          providerData: amadeusBooking.data,
          status: BookingStatus.CONFIRMED,
          bookingData: updatedBookingData,
        },
      });

      this.logger.log(`✅ Successfully created Amadeus hotel order ${amadeusBooking.data.id} with original price ${originalTotal} ${originalCurrency}`);

      return {
        orderId: amadeusBooking.data.id,
        orderData: amadeusBooking.data,
      };
    } catch (error: any) {
      const errResponse = error?.getResponse?.();
      const status = error?.getStatus?.() ?? error?.statusCode;
      const amadeusMessage =
        typeof errResponse === 'object' && errResponse?.message
          ? errResponse.message
          : typeof errResponse === 'string'
            ? errResponse
            : error?.message;
      this.logger.error(
        `Failed to create Amadeus booking for booking ${bookingId}: status=${status} message=${amadeusMessage}`,
      );
      
      const errorData = {
        amadeusError: {
          code: error?.code || status,
          title: error?.title || 'Amadeus API Error',
          detail: amadeusMessage,
          status: status,
          message: amadeusMessage,
        },
        orderCreationError: amadeusMessage,
        orderCreationFailedAt: new Date().toISOString(),
      };
      
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          providerData: errorData,
        },
      }).catch(e => this.logger.error('Failed to save error to providerData:', e));
      
      if (errResponse && typeof errResponse === 'object' && errResponse.errors) {
        this.logger.error(`Amadeus errors: ${JSON.stringify(redactCardData(errResponse.errors))}`);
      }
      throw error;
    }
  }
}
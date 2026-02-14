import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
      const { offerPrice, currency, cancellationDeadline, cancellationPolicySnapshot, policyAccepted, clientIp, userAgent } = dto;

      // BOOKING_OPERATIONS_AND_RISK: require explicit policy acceptance for dispute defense
      if (!policyAccepted) {
        throw new BadRequestException(
          'You must agree to the cancellation and no-show policy before booking. Please check the box to confirm.',
        );
      }

      const deadlineUtc = new Date(cancellationDeadline);
      if (isNaN(deadlineUtc.getTime())) {
        throw new BadRequestException('Invalid cancellation deadline. Use ISO 8601 format (e.g. 2026-02-14T23:59:00.000Z).');
      }

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

      // Merchant model: no guest card; customer pays via Stripe, we pay Amadeus with agency card later.
      // Guest-card model: encrypt and store guest card for Amadeus (and optional margin charge).
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
          payment_method: dto.payment?.method ?? 'CREDIT_CARD',
          ...(paymentCardInfo && { payment_card_info: paymentCardInfo }),
          travel_agent_email: dto.travelAgentEmail,
          accommodation_special_requests: dto.accommodationSpecialRequests,
          offer_price: basePrice,
          offer_currency: currency,
        },
        passengerInfo,
        status: BookingStatus.PENDING,
        paymentStatus: 'PENDING',
        // BOOKING_OPERATIONS_AND_RISK: store for cancellation logic and dispute evidence
        cancellationDeadline: deadlineUtc,
        cancellationPolicySnapshot: cancellationPolicySnapshot.trim(),
        policyAcceptedAt: new Date(),
        ...(clientIp && { clientIp }),
        ...(userAgent && { userAgent }),
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

      const offerId = bookingData.amadeus_offer_id || bookingData.offerId;
      if (!offerId) {
        throw new BadRequestException('Booking missing Amadeus offer ID (amadeus_offer_id or offerId)');
      }

      // Reconstruct guests: prefer bookingData.guests, else build from passengerInfo
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

      // Reconstruct room associations: prefer stored, else default one guest in one room
      let roomAssociations = bookingData.room_associations || [];
      if (roomAssociations.length === 0 && guests.length > 0) {
        roomAssociations = [
          { hotelOfferId: offerId, guestReferences: [{ guestReference: '1' }] },
        ];
      }

      // Card for Amadeus: guest card (stored at booking) or agency card (merchant model)
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
          this.logger.error(`Failed to decrypt card details for booking ${bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      // Create Amadeus booking
      const amadeusBooking = await this.amadeusService.createHotelBooking({
        hotelOfferId: offerId,
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

      // Update booking with Amadeus order ID; clear guest card if present (security)
      const updatedBookingData = { ...bookingData };
      if (bookingData.payment_card_info) {
        updatedBookingData.payment_card_info = {
          ...bookingData.payment_card_info,
          encrypted: null,
          cardLast4: bookingData.payment_card_info.cardLast4,
        };
      }
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          providerBookingId: amadeusBooking.data.id,
          providerData: amadeusBooking.data,
          status: BookingStatus.CONFIRMED,
          bookingData: updatedBookingData,
        },
      });

      this.logger.log(`Successfully created Amadeus hotel order ${amadeusBooking.data.id} for booking ${bookingId}`);

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
      if (errResponse && typeof errResponse === 'object' && errResponse.errors) {
        this.logger.error(`Amadeus errors: ${JSON.stringify(redactCardData(errResponse.errors))}`);
      }
      throw error;
    }
  }
}


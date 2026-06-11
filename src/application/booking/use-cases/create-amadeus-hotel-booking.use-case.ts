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

      // Ensure offerPrice is a number
      const frontendTotalAmount = typeof offerPrice === 'number' 
        ? offerPrice 
        : parseFloat(offerPrice as any || '0');

      const serviceFee = markupConfig.serviceFeeAmount || 0;
      const markupPercentage = markupConfig.markupPercentage || 0;

      // Calculate base price for financial records (reverse calculation)
      // Formula: offerPrice = basePrice + (basePrice * markup%) + serviceFee
      // So: basePrice = (offerPrice - serviceFee) / (1 + markupPercentage / 100)
      const calculatedBasePrice = (frontendTotalAmount - serviceFee) / (1 + markupPercentage / 100);

      if (calculatedBasePrice <= 0) {
        throw new BadRequestException('Invalid offer price. Price must be greater than 0.');
      }

      // Calculate markup amount for records
      const calculatedMarkupAmount = (calculatedBasePrice * markupPercentage) / 100;

      // Use frontend's total amount, not recalculated
      const pricing = {
        basePrice: calculatedBasePrice,
        markupAmount: calculatedMarkupAmount,
        serviceFee: serviceFee,
        totalAmount: frontendTotalAmount,
      };

      this.logger.log(`Price breakdown - Base: ${pricing.basePrice}, Markup: ${pricing.markupAmount}, Service Fee: ${pricing.serviceFee}, Total: ${pricing.totalAmount}`);

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
          offer_price: dto.offerPrice,
          frontend_total: frontendTotalAmount,
          markup_config_used: {
            markupPercentage,
            serviceFee,
            currency,
          },
          original_offer_price: {
            currency: currency,
            total: frontendTotalAmount.toString(),
            base: calculatedBasePrice.toString(),
          },
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

      // Reconstruct guests
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

      // Reconstruct room associations
      let roomAssociations = bookingData.room_associations || [];
      if (roomAssociations.length === 0 && guests.length > 0) {
        roomAssociations = [
          { hotelOfferId: offerId, guestReferences: [{ guestReference: '1' }] },
        ];
      }

      // Card for Amadeus
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

      // ✅ FIX: Convert Decimal to number properly
      const totalAmount = typeof booking.totalAmount === 'number' 
        ? booking.totalAmount 
        : booking.totalAmount && typeof (booking.totalAmount as any).toNumber === 'function'
          ? (booking.totalAmount as any).toNumber()
          : parseFloat(String(booking.totalAmount) || '0');
      
      const currency = booking.currency;
      const markupConfig = bookingData.markup_config_used || {};
      const markupPercentage = markupConfig.markupPercentage || 0;
      const serviceFee = typeof markupConfig.serviceFee === 'number'
        ? markupConfig.serviceFee
        : parseFloat(String(markupConfig.serviceFee) || '0');
      
      const basePrice = typeof booking.basePrice === 'number'
        ? booking.basePrice
        : booking.basePrice && typeof (booking.basePrice as any).toNumber === 'function'
          ? (booking.basePrice as any).toNumber()
          : parseFloat(String(booking.basePrice) || '0');

      // Calculate the markup amount with proper numbers
      const markupAmount = totalAmount - basePrice - serviceFee;

      // ✅ FIX: Amadeus does NOT accept 'markups' array
      // Send ONLY the total and base price in the hotel's local currency
      // The markup is your profit - store it in your database but don't send to Amadeus
      
      // IMPORTANT: Convert currency if needed (e.g., NGN → GBP/EUR)
      // You need to implement currency conversion here using your conversion API
      const hotelLocalCurrency = 'GBP'; // or get from hotel's location
      const conversionRate = 1; // Replace with your actual conversion API call
      
      const convertedTotal = totalAmount / conversionRate;
      const convertedBase = basePrice / conversionRate;
      
      // ✅ CORRECT: Send ONLY total and base (no markups array)
      const priceForAmadeus = {
        currency: hotelLocalCurrency, // Use local currency, not NGN
        total: convertedTotal.toFixed(2),
        base: convertedBase.toFixed(2),
        // ❌ REMOVED: markups array - Amadeus doesn't accept this
        // ✅ Keep taxes if needed, but simplify
        taxes: [
          {
            code: "TAX",
            amount: "0.00",
            included: true,
          },
        ],
      };

      this.logger.log(`💰 Sending price to Amadeus (${hotelLocalCurrency}): ${JSON.stringify(priceForAmadeus)}`);
      this.logger.log(`📊 Your markup (profit) stored in DB - Amount: ${markupAmount.toFixed(2)} ${currency}, Percentage: ${markupPercentage}%`);

      // Create Amadeus booking with simplified price (no markups)
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
        price: priceForAmadeus, // Using simplified price object
      });

      // Update booking with Amadeus order ID
      const updatedBookingData = { ...bookingData };
      if (bookingData.payment_card_info) {
        updatedBookingData.payment_card_info = {
          ...bookingData.payment_card_info,
          encrypted: null,
          cardLast4: bookingData.payment_card_info.cardLast4,
        };
      }
      
      // Store the markup information for your records (not sent to Amadeus)
      updatedBookingData.markup_applied = {
        amount: markupAmount,
        percentage: markupPercentage,
        serviceFee: serviceFee,
        originalCurrency: currency,
        convertedCurrency: hotelLocalCurrency,
        convertedTotal: convertedTotal,
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

      this.logger.log(`✅ Successfully created Amadeus hotel order ${amadeusBooking.data.id} with marked-up price (markup stored locally)`);

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
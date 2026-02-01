import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus } from '@prisma/client';
import { retryWithBackoffAndLogging } from '@common/utils/retry.util';

@Injectable()
export class CreateDuffelOrderUseCase {
  private readonly logger = new Logger(CreateDuffelOrderUseCase.name);

  constructor(
    private readonly duffelService: DuffelService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(bookingId: string): Promise<{ orderId: string; orderData: any }> {
    // Get booking from database
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found.`);
    }

    // Only create order if payment is completed
    if (booking.paymentStatus !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot create Duffel order: Payment status is ${booking.paymentStatus}. Payment must be completed first.`,
      );
    }

    // Check if order already exists
    if (booking.providerBookingId) {
      this.logger.warn(
        `Booking ${bookingId} already has a Duffel order: ${booking.providerBookingId}. Skipping order creation.`,
      );
      return {
        orderId: booking.providerBookingId,
        orderData: booking.providerData as any,
      };
    }

    // Extract offer ID and passenger info from booking data
    const bookingData = booking.bookingData as any;
    const passengerInfo = booking.passengerInfo as any;

    if (!bookingData?.offerId) {
      throw new BadRequestException(
        'Booking data is missing offerId. Cannot create Duffel order without an offer.',
      );
    }

    if (!passengerInfo) {
      throw new BadRequestException(
        'Passenger information is missing. Cannot create Duffel order without passenger details.',
      );
    }

    try {
      // Fetch the offer to get passenger IDs (required by Duffel)
      this.logger.log(`Fetching offer ${bookingData.offerId} to get passenger IDs...`);
      const offerResponse = await this.duffelService.getOffer(bookingData.offerId);
      const offer = offerResponse.data;

      if (!offer || !offer.passengers || offer.passengers.length === 0) {
        throw new BadRequestException(
          'Offer does not contain passenger information. Cannot create order.',
        );
      }

      // Map our passenger info to Duffel passenger IDs from the offer
      const passengers = Array.isArray(passengerInfo) ? passengerInfo : [passengerInfo];
      
      if (passengers.length !== offer.passengers.length) {
        throw new BadRequestException(
          `Passenger count mismatch: Booking has ${passengers.length} passengers, but offer has ${offer.passengers.length}.`,
        );
      }

      const duffelPassengers = passengers.map((passenger: any, index: number) => {
        // Get passenger ID from the offer (required by Duffel)
        const offerPassenger = offer.passengers[index];
        if (!offerPassenger || !offerPassenger.id) {
          throw new BadRequestException(
            `Offer passenger at index ${index} is missing ID. Cannot create order.`,
          );
        }

        // Parse date of birth if provided
        let bornOn: string | undefined;
        if (passenger.dateOfBirth) {
          const dob = new Date(passenger.dateOfBirth);
          bornOn = dob.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (passenger.bornOn) {
          bornOn = passenger.bornOn;
        } else if (offerPassenger.born_on) {
          bornOn = offerPassenger.born_on;
        }

        return {
          id: offerPassenger.id, // CRITICAL: Use passenger ID from offer
          title: passenger.title || offerPassenger.title,
          gender: passenger.gender || offerPassenger.gender,
          given_name: passenger.firstName || passenger.given_name || passenger.givenName || offerPassenger.given_name,
          family_name: passenger.lastName || passenger.family_name || passenger.familyName || offerPassenger.family_name,
          born_on: bornOn,
          email: passenger.email || offerPassenger.email,
          phone_number: passenger.phone || passenger.phoneNumber || offerPassenger.phone_number,
          identity_documents: passenger.identityDocuments || passenger.identity_documents || offerPassenger.identity_documents,
        };
      });

      this.logger.log(`Prepared ${duffelPassengers.length} passengers for order creation`);

      // Create Duffel order with retry logic
      const orderData = await retryWithBackoffAndLogging(
        () =>
          this.duffelService.createOrder({
            selected_offers: [bookingData.offerId],
            passengers: duffelPassengers,
            payments: [
              {
                type: 'balance', // Using balance payment (you've already paid via Stripe)
              },
            ],
            metadata: {
              booking_id: bookingId,
              booking_reference: booking.reference,
            },
          }),
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          maxDelayMs: 10000,
          logger: this.logger,
          context: `Creating Duffel order for booking ${bookingId}`,
        },
      );

      // Update booking with Duffel order ID and order data
      await this.bookingRepository.update(bookingId, {
        providerBookingId: orderData.id,
        providerData: orderData,
        status: BookingStatus.CONFIRMED,
      });

      this.logger.log(
        `Successfully created Duffel order ${orderData.id} for booking ${bookingId}`,
      );

      return {
        orderId: orderData.id,
        orderData,
      };
    } catch (error) {
      this.logger.error(`Failed to create Duffel order for booking ${bookingId}:`, error);

      // Update booking status to indicate order creation failed
      await this.bookingRepository.update(bookingId, {
        status: BookingStatus.FAILED,
        providerData: {
          ...(booking.providerData as any),
          orderCreationError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }
}


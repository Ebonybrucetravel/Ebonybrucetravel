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
  ) { }

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

      // Check if the offer requires identity documents (e.g. passport for international flights)
      const identityDocsRequired = offer.passenger_identity_documents_required === true;
      if (identityDocsRequired) {
        this.logger.log('Offer requires passenger identity documents (e.g. passport)');
      }

      // Map our passenger info to Duffel passenger IDs from the offer
      const passengers = Array.isArray(passengerInfo) ? passengerInfo : [passengerInfo];

      if (passengers.length !== offer.passengers.length) {
        throw new BadRequestException(
          `Passenger count mismatch: Booking has ${passengers.length} passengers, but offer has ${offer.passengers.length}.`,
        );
      }

      // Duffel requires title, gender, born_on for each passenger (no blanks allowed)
      const allowedTitles = ['mr', 'mrs', 'ms', 'miss', 'dr'];
      const allowedGenders = ['m', 'f'];

      const duffelPassengers = passengers.map((passenger: any, index: number) => {
        // Get passenger ID from the offer (required by Duffel)
        const offerPassenger = offer.passengers[index];
        if (!offerPassenger || !offerPassenger.id) {
          throw new BadRequestException(
            `Offer passenger at index ${index} is missing ID. Cannot create order.`,
          );
        }

        // Parse date of birth (required by Duffel - cannot be blank)
        let bornOn: string | undefined;
        if (passenger.dateOfBirth) {
          const dob = new Date(passenger.dateOfBirth);
          if (Number.isNaN(dob.getTime())) {
            throw new BadRequestException(
              `Passenger ${index + 1}: invalid dateOfBirth "${passenger.dateOfBirth}". Use YYYY-MM-DD.`,
            );
          }
          bornOn = dob.toISOString().split('T')[0];
        } else if (passenger.bornOn && String(passenger.bornOn).trim()) {
          bornOn = String(passenger.bornOn).trim().slice(0, 10);
        } else if (offerPassenger.born_on) {
          bornOn = offerPassenger.born_on;
        }
        if (!bornOn || bornOn.length < 10) {
          throw new BadRequestException(
            `Passenger ${index + 1}: date of birth is required for flight bookings. ` +
            'Provide passengerInfo[].dateOfBirth (YYYY-MM-DD) when creating the booking.',
          );
        }

        // Title: required by Duffel; default to 'mr' if missing
        let title = (passenger.title || offerPassenger.title || 'mr').toString().trim().toLowerCase();
        if (!allowedTitles.includes(title)) {
          title = 'mr';
        }

        // Gender: required by Duffel; default to 'm' if missing
        let gender = (passenger.gender || offerPassenger.gender || 'm').toString().trim().toLowerCase();
        if (!allowedGenders.includes(gender)) {
          gender = 'm';
        }

        const givenName =
          passenger.firstName || passenger.given_name || passenger.givenName || offerPassenger.given_name || '';
        const familyName =
          passenger.lastName || passenger.family_name || passenger.familyName || offerPassenger.family_name || '';
        if (!givenName.trim() || !familyName.trim()) {
          throw new BadRequestException(
            `Passenger ${index + 1}: first name and last name are required.`,
          );
        }

        const email = (passenger.email || offerPassenger.email || '').trim();
        if (!email) {
          throw new BadRequestException(
            `Passenger ${index + 1}: email is required for flight bookings.`,
          );
        }

        // Map identity documents from camelCase DTO to Duffel snake_case format
        let identityDocs = passenger.identityDocuments || passenger.identity_documents || offerPassenger.identity_documents;
        if (identityDocs && Array.isArray(identityDocs)) {
          identityDocs = identityDocs.map((doc: any) => ({
            type: doc.type,
            unique_identifier: doc.uniqueIdentifier || doc.unique_identifier,
            issuing_country_code: doc.issuingCountryCode || doc.issuing_country_code,
            expires_on: doc.expiresOn || doc.expires_on,
          }));
        }

        // Enforce identity documents when offer requires them
        if (identityDocsRequired && (!identityDocs || identityDocs.length === 0)) {
          throw new BadRequestException(
            `Passenger ${index + 1}: this flight requires identity documents (e.g. passport). ` +
            'Provide passengerInfo.identityDocuments with type, uniqueIdentifier, issuingCountryCode, and expiresOn.',
          );
        }

        // Map loyalty programme accounts from camelCase DTO to Duffel snake_case format
        let loyaltyAccounts = passenger.loyaltyProgrammeAccounts || passenger.loyalty_programme_accounts;
        if (loyaltyAccounts && Array.isArray(loyaltyAccounts)) {
          loyaltyAccounts = loyaltyAccounts.map((acct: any) => ({
            airline_iata_code: acct.airlineIataCode || acct.airline_iata_code,
            account_number: acct.accountNumber || acct.account_number,
          }));
        }

        return {
          id: offerPassenger.id,
          title,
          gender,
          given_name: givenName.trim(),
          family_name: familyName.trim(),
          born_on: bornOn,
          email,
          phone_number: passenger.phone || passenger.phoneNumber || offerPassenger.phone_number,
          identity_documents: identityDocs,
          loyalty_programme_accounts: loyaltyAccounts,
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
                amount: offer.total_amount,
                currency: offer.total_currency,
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
          orderCreationFailedAt: new Date().toISOString(),
        },
      });

      throw error;
    }
  }
}


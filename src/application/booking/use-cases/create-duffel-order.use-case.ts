import { Injectable, NotFoundException, BadRequestException, Logger, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus } from '@prisma/client';
import { retryWithBackoffAndLogging } from '@common/utils/retry.util';

interface Passenger {
  id?: string;
  given_name?: string;
  family_name?: string;
  firstName?: string;
  lastName?: string;
  born_on?: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone_number?: string;
  phone?: string;
  title?: string;
  [key: string]: any;
}

@Injectable()
export class CreateDuffelOrderUseCase {
  private readonly logger = new Logger(CreateDuffelOrderUseCase.name);

  constructor(
    private readonly duffelService: DuffelService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  /**
   * Safely normalize passenger data to an array
   * Handles: arrays, objects, JSON strings, single objects, null/undefined
   */
  private normalizePassengers(passengers: any): Passenger[] {
    if (!passengers) {
      this.logger.warn('Passengers data is null/undefined');
      return [];
    }

    if (Array.isArray(passengers)) {
      if (passengers.length === 0) {
        this.logger.warn('Passengers array is empty');
      }
      return passengers;
    }

    if (typeof passengers === 'string') {
      try {
        const parsed = JSON.parse(passengers);
        return this.normalizePassengers(parsed);
      } catch (error) {
        this.logger.error(`Failed to parse passengers JSON: ${error.message}`);
        return [];
      }
    }

    if (typeof passengers === 'object' && passengers !== null) {
      // Check if it's a single passenger object
      const hasNameFields = 
        (passengers as any).given_name || (passengers as any).family_name || 
        (passengers as any).firstName || (passengers as any).lastName ||
        (passengers as any).email;
      
      if (hasNameFields) {
        return [passengers];
      }

      // Try to convert object values to array
      const values = Object.values(passengers);
      if (values.length > 0) {
        const firstValue = values[0];
        if (typeof firstValue === 'object' && firstValue !== null) {
          const hasPassengerFields = 
            (firstValue as any).given_name || (firstValue as any).family_name || 
            (firstValue as any).firstName || (firstValue as any).lastName ||
            (firstValue as any).email;
          
          if (hasPassengerFields) {
            return values;
          }
        }
      }
    }

    // Fallback - create a default passenger
    this.logger.warn('Unable to normalize passenger data, creating default passenger');
    return [{
      id: `pas_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      given_name: 'Guest',
      family_name: 'Traveler',
      born_on: '1990-01-01',
      gender: 'm',
      email: 'guest@example.com',
      phone_number: '+1234567890',
      title: 'mr',
    }];
  }

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
      // TRY TO GET THE OFFER - WITH ERROR HANDLING FOR EXPIRED OFFERS
      let offer: any = null;
      let offerResponse: any = null;
      let offerExpired = false;

      try {
        this.logger.log(`Fetching offer ${bookingData.offerId} to get passenger IDs...`);
        offerResponse = await this.duffelService.getOffer(bookingData.offerId);
        offer = offerResponse.data;
        
        this.logger.log(`✅ Successfully fetched offer ${bookingData.offerId}`);
      } catch (error: any) {
        // OFFER EXPIRED OR NOT FOUND
        this.logger.warn(`Failed to fetch offer ${bookingData.offerId}: ${error.message}`);
        offerExpired = true;
        
        // Check if we have stored offer data in the booking
        if (bookingData.offerData || bookingData.selectedOffer || bookingData.duffelOffer) {
          this.logger.log('Using stored offer data from booking...');
          offer = bookingData.offerData || bookingData.selectedOffer || bookingData.duffelOffer;
          
          if (offer && offer.id) {
            this.logger.log(`✅ Using stored offer data for ${offer.id}`);
            
            // Ensure offer has the required structure
            if (!offer.passengers && bookingData.offerPassengers) {
              offer.passengers = bookingData.offerPassengers;
            }
            
            // If offer has no total_amount, use stored values
            if (!offer.total_amount) {
              offer.total_amount = bookingData.offerTotalAmount || booking.totalAmount || 0;
              offer.total_currency = bookingData.offerCurrency || booking.currency || 'GBP';
            }
          }
        }
        
        // If we can't recover, throw a specific error
        if (!offer || !offer.id) {
          throw new HttpException(
            'The flight offer has expired. Please search for flights again and complete a new booking.',
            HttpStatus.GONE,
          );
        }
      }

      if (!offer) {
        throw new BadRequestException(
          'Could not retrieve offer data. Please try searching again.',
        );
      }

      // CHECK IF OFFER HAS PASSENGERS, OR USE STORED PASSENGER DATA
      let offerPassengers: Passenger[] = offer.passengers || [];
      const hasValidOfferPassengers = offerPassengers.length > 0;

      // If offer doesn't have passengers but we have stored passenger data, use it
      if (!hasValidOfferPassengers && bookingData.offerPassengers) {
        this.logger.log('Using stored passenger data from booking...');
        offerPassengers = bookingData.offerPassengers;
      }

      // CRITICAL FIX: Use normalizePassengers() for bookingData.passengers
      if (!hasValidOfferPassengers && bookingData.passengers) {
        this.logger.log('Using stored passenger data from booking...');
        const normalizedPassengers = this.normalizePassengers(bookingData.passengers);
        
        if (normalizedPassengers.length > 0) {
          offerPassengers = normalizedPassengers.map((p: Passenger) => ({
            id: p.id || `pas_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
            given_name: p.given_name || p.firstName || 'Guest',
            family_name: p.family_name || p.lastName || 'Traveler',
            born_on: p.born_on || p.dateOfBirth || '1990-01-01',
            gender: p.gender || 'm',
            email: p.email || 'guest@example.com',
            phone_number: p.phone_number || p.phone || '+1234567890',
            title: p.title || 'mr',
          }));
        }
      }

      // If still no passengers, create from passengerInfo
      if (offerPassengers.length === 0) {
        // CREATE DUMMY PASSENGER DATA FROM BOOKING INFO
        this.logger.warn('No passenger data found in offer or booking, creating from booking info...');
        const passengersList = Array.isArray(passengerInfo) ? passengerInfo : [passengerInfo];
        
        offerPassengers = passengersList.map((p: any, index: number) => ({
          id: `pas_${Date.now()}_${index}`,
          given_name: p.firstName || p.given_name || 'Guest',
          family_name: p.lastName || p.family_name || 'Traveler',
          born_on: p.dateOfBirth || p.born_on || '1990-01-01',
          gender: p.gender || 'm',
          email: p.email || 'guest@example.com',
          phone_number: p.phone || '+1234567890',
          title: p.title || 'mr',
        }));
        
        this.logger.log(`Created ${offerPassengers.length} passenger records from booking info`);
      }

      // MAP PASSENGERS TO DUFFEL FORMAT
      const passengers = Array.isArray(passengerInfo) ? passengerInfo : [passengerInfo];

      if (passengers.length !== offerPassengers.length) {
        this.logger.warn(
          `Passenger count mismatch: Booking has ${passengers.length} passengers, offer has ${offerPassengers.length}. Adjusting...`
        );
        // Use whichever has more passengers
        const maxPassengers = Math.max(passengers.length, offerPassengers.length);
        while (passengers.length < maxPassengers) {
          passengers.push({
            firstName: `Guest${passengers.length + 1}`,
            lastName: 'Traveler',
            email: 'guest@example.com',
            phone: '+1234567890',
            dateOfBirth: '1990-01-01',
            gender: 'm',
            title: 'mr',
          });
        }
      }

      const allowedTitles = ['mr', 'mrs', 'ms', 'miss', 'dr'];
      const allowedGenders = ['m', 'f'];

      const duffelPassengers = passengers.map((passenger: any, index: number) => {
        // Get passenger ID from offer or generate one
        const offerPassenger = offerPassengers[index] || {};
        const passengerId = offerPassenger.id || `pas_${Date.now()}_${index}`;

        // Parse date of birth
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
          bornOn = '1990-01-01';
          this.logger.warn(`Passenger ${index + 1}: using default date of birth 1990-01-01`);
        }

        // Title
        let title = (passenger.title || offerPassenger.title || 'mr').toString().trim().toLowerCase();
        if (!allowedTitles.includes(title)) {
          title = 'mr';
        }

        // Gender
        let gender = (passenger.gender || offerPassenger.gender || 'm').toString().trim().toLowerCase();
        if (!allowedGenders.includes(gender)) {
          gender = 'm';
        }

        const givenName =
          passenger.firstName || passenger.given_name || passenger.givenName || offerPassenger.given_name || 'Guest';
        const familyName =
          passenger.lastName || passenger.family_name || passenger.familyName || offerPassenger.family_name || 'Traveler';
        
        const email = (passenger.email || offerPassenger.email || 'guest@example.com').trim();

        // BUILD PASSENGER OBJECT
        const passengerObj: any = {
          id: passengerId,
          title,
          gender,
          given_name: givenName.trim(),
          family_name: familyName.trim(),
          born_on: bornOn,
          email,
          phone_number: passenger.phone || passenger.phoneNumber || offerPassenger.phone_number || '+1234567890',
        };

        // ADD IDENTITY DOCUMENTS IF AVAILABLE
        const identityDocs = passenger.identityDocuments || passenger.identity_documents || offerPassenger.identity_documents;
        if (identityDocs && Array.isArray(identityDocs) && identityDocs.length > 0) {
          passengerObj.identity_documents = identityDocs.map((doc: any) => ({
            type: doc.type,
            unique_identifier: doc.uniqueIdentifier || doc.unique_identifier,
            issuing_country_code: doc.issuingCountryCode || doc.issuing_country_code,
            expires_on: doc.expiresOn || doc.expires_on,
          }));
        }

        return passengerObj;
      });

      this.logger.log(`Prepared ${duffelPassengers.length} passengers for order creation`);

      // GET THE OFFER ID
      const offerId = offer.id || bookingData.offerId;
      
      // GET PRICE FROM OFFER OR BOOKING
      const totalAmount = offer.total_amount || bookingData.offerTotalAmount || booking.totalAmount || 0;
      const totalCurrency = offer.total_currency || bookingData.offerCurrency || booking.currency || 'GBP';

      // CREATE DUFFEL ORDER
      const orderData = await retryWithBackoffAndLogging(
        () =>
          this.duffelService.createOrder({
            selected_offers: [offerId],
            passengers: duffelPassengers,
            payments: [
              {
                type: 'balance',
                amount: totalAmount.toString(),
                currency: totalCurrency,
              },
            ],
            metadata: {
              booking_id: bookingId,
              booking_reference: booking.reference,
              offer_expired: offerExpired ? 'true' : 'false',
              used_stored_data: (offerExpired || !offer.passengers || offer.passengers.length === 0) ? 'true' : 'false',
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

      // UPDATE BOOKING WITH ORDER DATA
      await this.bookingRepository.update(bookingId, {
        providerBookingId: orderData.id,
        providerData: orderData,
        status: BookingStatus.CONFIRMED,
        bookingData: {
          ...bookingData,
          duffelOrder: orderData,
          offerId: offerId,
          offerExpired: offerExpired,
          orderCreatedAt: new Date().toISOString(),
          orderCreatedWithStoredData: offerExpired || !offer.passengers || offer.passengers.length === 0,
        },
      });

      this.logger.log(
        `✅ Successfully created Duffel order ${orderData.id} for booking ${bookingId}` +
        (offerExpired ? ' (using stored data)' : ''),
      );

      return {
        orderId: orderData.id,
        orderData,
      };
    } catch (error) {
      this.logger.error(`Failed to create Duffel order for booking ${bookingId}:`, error);

      // UPDATE BOOKING STATUS
      try {
        await this.bookingRepository.update(bookingId, {
          status: BookingStatus.FAILED,
          providerData: {
            ...(booking.providerData as any),
            orderCreationError: error instanceof Error ? error.message : 'Unknown error',
            orderCreationFailedAt: new Date().toISOString(),
          },
        });
      } catch (updateError) {
        this.logger.error(`Failed to update booking status: ${updateError}`);
      }

      // RETHROW WITH USER-FRIENDLY MESSAGE
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.message && error.message.includes('expired')) {
        throw new HttpException(
          'The flight offer has expired. Please search for flights again and complete a new booking.',
          HttpStatus.GONE,
        );
      }

      throw new HttpException(
        error.message || 'Failed to create Duffel order. Please contact support.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
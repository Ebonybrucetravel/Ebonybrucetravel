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
      const hasNameFields = 
        (passengers as any).given_name || (passengers as any).family_name || 
        (passengers as any).firstName || (passengers as any).lastName ||
        (passengers as any).email;
      
      if (hasNameFields) {
        return [passengers];
      }

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

  private findOfferIdInObject(obj: any, depth: number = 0): string | null {
    if (!obj || typeof obj !== 'object' || depth > 10) {
      return null;
    }

    if (obj.id && typeof obj.id === 'string' && obj.id.startsWith('off_')) {
      return obj.id;
    }

    if (obj.offer_id && typeof obj.offer_id === 'string' && obj.offer_id.startsWith('off_')) {
      return obj.offer_id;
    }

    if (obj.selected_offer_id && typeof obj.selected_offer_id === 'string' && obj.selected_offer_id.startsWith('off_')) {
      return obj.selected_offer_id;
    }

    if (obj.data && typeof obj.data === 'object') {
      const result = this.findOfferIdInObject(obj.data, depth + 1);
      if (result) return result;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item?.id?.startsWith('off_')) {
          return item.id;
        }
        const result = this.findOfferIdInObject(item, depth + 1);
        if (result) return result;
      }
    } else {
      for (const key of Object.keys(obj)) {
        if (key === 'passengers' || key === 'slices' || key === 'offers' || key === 'data') {
          const result = this.findOfferIdInObject(obj[key], depth + 1);
          if (result) return result;
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          const result = this.findOfferIdInObject(obj[key], depth + 1);
          if (result) return result;
        }
      }
    }

    return null;
  }

  /**
   * ✅ DUFFEL ONLY: Validate and fix offer ID
   * If we have an 'orq_' ID but no 'off_' ID, try to fetch offers from Duffel
   */
  private async validateAndFixOfferId(offerId: string, bookingData: any): Promise<string> {
    // If it's already a valid offer ID (starts with 'off_'), return it
    if (offerId?.startsWith('off_')) {
      this.logger.log(`✅ Valid offer ID: ${offerId}`);
      return offerId;
    }

    // If it starts with 'orq_', it's a request ID - try to find the actual offer ID
    if (offerId?.startsWith('orq_')) {
      this.logger.warn(`⚠️ Detected offer request ID: ${offerId}. Looking for actual offer ID...`);
      
      // Try to find in stored data first
      if (bookingData?.offerData) {
        const foundId = this.findOfferIdInObject(bookingData.offerData);
        if (foundId) {
          this.logger.log(`✅ Found offer ID in offerData: ${foundId}`);
          return foundId;
        }
      }

      if (bookingData) {
        const foundId = this.findOfferIdInObject(bookingData);
        if (foundId) {
          this.logger.log(`✅ Found offer ID in bookingData: ${foundId}`);
          return foundId;
        }
      }

      // ✅ NEW: Call Duffel API to get offers for this request
      try {
        this.logger.log(`🔍 Fetching offers from Duffel for request: ${offerId}...`);
        
        // Use the listOffers method to get offers for this request
        const offersResponse = await this.duffelService.listOffers(offerId, { limit: 10 });
        
        if (offersResponse?.data && offersResponse.data.length > 0) {
          // Use the first offer
          const firstOffer = offersResponse.data[0];
          this.logger.log(`✅ Retrieved offer from Duffel: ${firstOffer.id}`);
          
          // Store the offer data for future use
          bookingData.offerData = firstOffer;
          
          // Update the offerId in bookingData
          bookingData.offerId = firstOffer.id;
          
          return firstOffer.id;
        } else {
          this.logger.warn(`No offers found for request: ${offerId}`);
        }
      } catch (error: any) {
        this.logger.warn(`Failed to fetch offers from Duffel: ${error.message}`);
      }

      // Last resort: search the entire JSON string
      try {
        const jsonString = JSON.stringify(bookingData);
        const matches = jsonString.match(/off_[a-zA-Z0-9]+/g);
        if (matches && matches.length > 0) {
          this.logger.log(`✅ Extracted offer ID from JSON: ${matches[0]}`);
          return matches[0];
        }
      } catch (error) {
        this.logger.warn(`Failed to search JSON for offer ID: ${error.message}`);
      }
    }

    // If we still don't have a valid offer ID, throw an error
    throw new BadRequestException(
      `Invalid offer ID format: ${offerId}. Expected format starting with 'off_'. Please select a valid flight offer.`,
    );
  }

  async execute(bookingId: string): Promise<{ orderId: string; orderData: any }> {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found.`);
    }

    if (booking.paymentStatus !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot create Duffel order: Payment status is ${booking.paymentStatus}. Payment must be completed first.`,
      );
    }

    if (booking.providerBookingId) {
      this.logger.warn(
        `Booking ${bookingId} already has a Duffel order: ${booking.providerBookingId}. Skipping order creation.`,
      );
      return {
        orderId: booking.providerBookingId,
        orderData: booking.providerData as any,
      };
    }

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

    // ✅ Validate and fix offer ID (async now)
    const validatedOfferId = await this.validateAndFixOfferId(bookingData.offerId, bookingData);
    this.logger.log(`✅ Validated offer ID: ${validatedOfferId}`);

    if (validatedOfferId !== bookingData.offerId) {
      this.logger.log(`📝 Updating bookingData.offerId from ${bookingData.offerId} to ${validatedOfferId}`);
      bookingData.offerId = validatedOfferId;
      
      try {
        await this.bookingRepository.update(bookingId, {
          bookingData: {
            ...bookingData,
            offerId: validatedOfferId,
            offerIdFixedAt: new Date().toISOString(),
            originalOfferId: bookingData.offerId,
          },
        });
        this.logger.log(`✅ Fixed offer ID in database for booking ${bookingId}`);
      } catch (updateError) {
        this.logger.warn(`Failed to update booking with fixed offer ID: ${updateError}`);
      }
    }

    try {
      let offer: any = null;
      let offerResponse: any = null;
      let offerExpired = false;

      try {
        this.logger.log(`Fetching offer ${validatedOfferId} to get passenger IDs...`);
        offerResponse = await this.duffelService.getOffer(validatedOfferId);
        offer = offerResponse.data;
        this.logger.log(`✅ Successfully fetched offer ${validatedOfferId}`);
      } catch (error: any) {
        this.logger.warn(`Failed to fetch offer ${validatedOfferId}: ${error.message}`);
        offerExpired = true;
        
        if (bookingData.offerData || bookingData.selectedOffer || bookingData.duffelOffer) {
          this.logger.log('Using stored offer data from booking...');
          offer = bookingData.offerData || bookingData.selectedOffer || bookingData.duffelOffer;
          
          if (offer && offer.id) {
            this.logger.log(`✅ Using stored offer data for ${offer.id}`);
            
            if (!offer.passengers && bookingData.offerPassengers) {
              offer.passengers = bookingData.offerPassengers;
            }
            
            if (!offer.total_amount) {
              offer.total_amount = bookingData.offerTotalAmount || booking.totalAmount || 0;
              offer.total_currency = bookingData.offerCurrency || booking.currency || 'GBP';
            }
          }
        }
        
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

      let offerPassengers: Passenger[] = offer.passengers || [];
      const hasValidOfferPassengers = offerPassengers.length > 0;

      if (!hasValidOfferPassengers && bookingData.offerPassengers) {
        this.logger.log('Using stored passenger data from booking...');
        offerPassengers = bookingData.offerPassengers;
      }

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

      if (offerPassengers.length === 0) {
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

      const passengers = Array.isArray(passengerInfo) ? passengerInfo : [passengerInfo];

      if (passengers.length !== offerPassengers.length) {
        this.logger.warn(
          `Passenger count mismatch: Booking has ${passengers.length} passengers, offer has ${offerPassengers.length}. Adjusting...`
        );
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
        const offerPassenger = offerPassengers[index] || {};
        const passengerId = offerPassenger.id || `pas_${Date.now()}_${index}`;

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

        let title = (passenger.title || offerPassenger.title || 'mr').toString().trim().toLowerCase();
        if (!allowedTitles.includes(title)) {
          title = 'mr';
        }

        let gender = (passenger.gender || offerPassenger.gender || 'm').toString().trim().toLowerCase();
        if (!allowedGenders.includes(gender)) {
          gender = 'm';
        }

        const givenName =
          passenger.firstName || passenger.given_name || passenger.givenName || offerPassenger.given_name || 'Guest';
        const familyName =
          passenger.lastName || passenger.family_name || passenger.familyName || offerPassenger.family_name || 'Traveler';
        
        const email = (passenger.email || offerPassenger.email || 'guest@example.com').trim();

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

      const offerId = offer.id || validatedOfferId;
      const totalAmount = offer.total_amount || bookingData.offerTotalAmount || booking.totalAmount || 0;
      const totalCurrency = offer.total_currency || bookingData.offerCurrency || booking.currency || 'GBP';

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
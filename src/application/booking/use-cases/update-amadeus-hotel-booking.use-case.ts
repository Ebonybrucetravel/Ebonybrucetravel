import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UpdateHotelBookingDto } from '@presentation/booking/dto/update-hotel-booking.dto';

@Injectable()
export class UpdateAmadeusHotelBookingUseCase {
  private readonly logger = new Logger(UpdateAmadeusHotelBookingUseCase.name);

  constructor(
    private readonly amadeusService: AmadeusService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: UpdateHotelBookingDto, userId?: string) {
    this.logger.log(`Updating hotel booking: ${dto.bookingId}`);

    // 1. Verify booking exists and belongs to user
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: dto.bookingId,
        ...(userId && { userId }),
        provider: 'AMADEUS',
        productType: 'HOTEL',
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    // 2. Extract hotel order ID and booking ID from provider data
    const hotelOrderId = dto.providerBookingId;
    const hotelBookingId = this.extractHotelBookingId(booking.providerData as any);
    
    if (!hotelOrderId || !hotelBookingId) {
      throw new BadRequestException(
        'Unable to update booking: Missing Amadeus booking identifiers. ' +
        'The booking may not have been fully confirmed with Amadeus yet.'
      );
    }

    this.logger.log(`Amadeus IDs - Order: ${hotelOrderId}, Booking: ${hotelBookingId}`);

    // 3. Prepare update data based on update type
    const updateData: any = {};
    const bookingData = booking.bookingData as any || {};
    
    // Handle Special Request updates
    if (dto.updateType === 'special' || dto.specialRequest) {
      updateData.specialRequest = dto.specialRequest || dto.payload?.hotelBooking?.roomAssociation?.specialRequest;
    }
    
    // ✅ Handle Date updates with re-pricing
    if (dto.updateType === 'dates' || dto.checkInDate || dto.checkOutDate) {
      const checkInDate = dto.checkInDate || dto.payload?.hotelBooking?.hotelOffer?.product?.checkInDate;
      const checkOutDate = dto.checkOutDate || dto.payload?.hotelBooking?.hotelOffer?.product?.checkOutDate;
      
      if (checkInDate && checkOutDate) {
        // ✅ STEP 1: Get the offer ID from booking data
        const offerId = bookingData.amadeus_offer_id || bookingData.offerId;
        
        if (offerId) {
          try {
            this.logger.log(`🔄 Re-pricing offer ${offerId} for new dates: ${checkInDate} - ${checkOutDate}`);
            
            // ✅ STEP 2: Re-price with new dates
            const repricedOffer = await this.amadeusService.repriceHotelOffer(offerId);
            
            if (repricedOffer?.data) {
              const newPrice = repricedOffer.data.price;
              this.logger.log(`✅ Re-priced successfully: ${newPrice.total} ${newPrice.currency}`);
              
              // ✅ STEP 3: Store the new price in booking data
              bookingData.updated_price = {
                total: newPrice.total,
                base: newPrice.base,
                currency: newPrice.currency,
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                updated_at: new Date().toISOString(),
              };
            }
          } catch (repricingError: any) {
            this.logger.warn(`⚠️ Repricing failed: ${repricingError.message}`);
            // Continue with the update anyway - Amadeus will handle it
          }
        }
        
        // ✅ STEP 4: Update dates
        updateData.checkInDate = checkInDate;
        updateData.checkOutDate = checkOutDate;
      }
    }
    
    // Handle Loyalty ID updates
    if (dto.updateType === 'loyalty' || dto.loyaltyId) {
      updateData.loyaltyId = dto.loyaltyId || dto.payload?.hotelBooking?.roomAssociation?.guestReferences?.[0]?.hotelLoyaltyId;
    }
    
    // Handle Payment updates
    if (dto.updateType === 'payment' || dto.payment) {
      const paymentCard = dto.payment?.paymentCard?.paymentCardInfo;
      if (paymentCard) {
        updateData.paymentCard = {
          vendorCode: paymentCard.vendorCode || 'VI',
          cardNumber: paymentCard.cardNumber,
          expiryDate: paymentCard.expiryDate,
          holderName: paymentCard.holderName,
          securityCode: paymentCard.securityCode,
        };
      }
    }

    // Validate at least one update field is provided
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid update fields provided');
    }

    // 4. Call Amadeus API to update booking
    try {
      const amadeusResponse = await this.amadeusService.updateHotelBooking(
        hotelOrderId,
        hotelBookingId,
        updateData,
      );

      this.logger.log(`Successfully updated Amadeus hotel booking ${dto.bookingId}`);

      // 5. Update local booking data
      if (updateData.specialRequest) {
        bookingData.specialRequest = updateData.specialRequest;
        bookingData.accommodation_special_requests = updateData.specialRequest;
      }
      if (updateData.checkInDate) {
        bookingData.checkInDate = updateData.checkInDate;
        bookingData.check_in_date = updateData.checkInDate;
      }
      if (updateData.checkOutDate) {
        bookingData.checkOutDate = updateData.checkOutDate;
        bookingData.check_out_date = updateData.checkOutDate;
      }
      if (updateData.loyaltyId) {
        bookingData.loyaltyId = updateData.loyaltyId;
      }

      await this.prisma.booking.update({
        where: { id: dto.bookingId },
        data: {
          bookingData: bookingData,
          ...(updateData.checkInDate && {
            cancellationDeadline: new Date(
              new Date(updateData.checkInDate).getTime() - 24 * 60 * 60 * 1000
            ).toISOString(),
          }),
        },
      });

      return {
        success: true,
        message: 'Booking updated successfully',
        data: amadeusResponse,
      };
    } catch (error: any) {
      this.logger.error(`Failed to update Amadeus hotel booking: ${error.message}`);
      
      // ✅ Provide more user-friendly error message for pricing changes
      if (error.message.includes('PRICING CONDITIONS HAVE CHANGED')) {
        throw new BadRequestException(
          'The price for the new dates has changed. Please search for the hotel again to get the latest rates and try again.'
        );
      }
      
      if (error.message.includes('INVALID OR MISSING DATA')) {
        throw new BadRequestException(
          'The selected dates are invalid. Please ensure the check-in date is in the future and before check-out.'
        );
      }
      
      throw new BadRequestException(
        error.message || 'Failed to update booking with hotel provider'
      );
    }
  }

  private extractHotelBookingId(providerData: any): string | null {
    try {
      const data = providerData?.data || providerData;
      const hotelBookingId = data?.hotelBookings?.[0]?.id;
      return hotelBookingId || null;
    } catch (error) {
      this.logger.error('Failed to extract hotel booking ID:', error);
      return null;
    }
  }
}
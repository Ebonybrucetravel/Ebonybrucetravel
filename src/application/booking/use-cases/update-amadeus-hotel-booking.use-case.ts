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
    
    if (dto.updateType === 'special' || dto.specialRequest) {
      updateData.specialRequest = dto.specialRequest || dto.payload?.hotelBooking?.roomAssociation?.specialRequest;
    }
    
    if (dto.updateType === 'dates' || dto.checkInDate || dto.checkOutDate) {
      updateData.checkInDate = dto.checkInDate || dto.payload?.hotelBooking?.hotelOffer?.product?.checkInDate;
      updateData.checkOutDate = dto.checkOutDate || dto.payload?.hotelBooking?.hotelOffer?.product?.checkOutDate;
    }
    
    if (dto.updateType === 'loyalty' || dto.loyaltyId) {
      updateData.loyaltyId = dto.loyaltyId || dto.payload?.hotelBooking?.roomAssociation?.guestReferences?.[0]?.hotelLoyaltyId;
    }
    
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
      const bookingData = booking.bookingData as any;
      
      if (updateData.specialRequest) {
        bookingData.specialRequest = updateData.specialRequest;
      }
      if (updateData.checkInDate) {
        bookingData.checkInDate = updateData.checkInDate;
      }
      if (updateData.checkOutDate) {
        bookingData.checkOutDate = updateData.checkOutDate;
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
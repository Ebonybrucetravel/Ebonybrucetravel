import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BookWakanowFlightUseCase } from './book-wakanow-flight.use-case';
import { BookWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

@Injectable()
export class BookWakanowFlightGuestUseCase {
  private readonly logger = new Logger(BookWakanowFlightGuestUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookWakanowUseCase: BookWakanowFlightUseCase,
  ) {}

  async execute(dto: any) {
   
    const passengers = dto.passengers || dto.bookingData?.passengers || [];
    const bookingId = dto.bookingId || dto.bookingData?.bookingId;
    const selectData = dto.selectData || dto.bookingData?.selectData;
    const targetCurrency = dto.targetCurrency || dto.bookingData?.targetCurrency || 'NGN';
    const isNorthAmerica = dto.isNorthAmerica ?? dto.bookingData?.isNorthAmerica ?? false;
    const destinationCode = dto.destinationCode || dto.bookingData?.destinationCode;
    const priceBreakdown = dto.priceBreakdown || dto.bookingData?.priceBreakdown;

    this.logger.log('📝 Booking Wakanow flight as guest...');
    this.logger.log(`👤 Passengers: ${passengers?.length || 0}`);
    this.logger.log(`🆔 BookingId: ${bookingId}`);
    this.logger.log(`📍 isNorthAmerica: ${isNorthAmerica}`);


    if (!bookingId) {
      throw new BadRequestException('BookingId is required');
    }
    if (!selectData) {
      throw new BadRequestException('SelectData is required');
    }
    if (!passengers || passengers.length === 0) {
      throw new BadRequestException('At least one passenger is required');
    }

    this.validateSelectData(selectData);


    if (isNorthAmerica) {
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        if (!p.PassportNumber) {
          throw new BadRequestException(`Passenger ${i + 1}: Passport number is required for North American flights`);
        }
        if (!p.ExpiryDate) {
          throw new BadRequestException(`Passenger ${i + 1}: Passport expiry date is required for North American flights`);
        }
        if (!p.PassportIssuingAuthority) {
          throw new BadRequestException(`Passenger ${i + 1}: Passport issuing authority is required for North American flights`);
        }
      }
      this.logger.log('✅ Passport validation passed for North America');
    }


    const leadPassenger = passengers?.[0];
    if (!leadPassenger?.email) {
      throw new BadRequestException('Lead passenger email is required for guest bookings');
    }
    if (!leadPassenger?.firstName) {
      throw new BadRequestException('Lead passenger first name is required for guest bookings');
    }
    if (!leadPassenger?.lastName) {
      throw new BadRequestException('Lead passenger last name is required for guest bookings');
    }


    const email = leadPassenger.email.toLowerCase().trim();
    const name = `${leadPassenger.firstName} ${leadPassenger.lastName}`.trim();
    const phone = leadPassenger.phoneNumber || null;

    let guestUser = null;
    try {
    
      guestUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!guestUser) {
      
        this.logger.log(`👤 Creating new guest user for ${email}`);
        guestUser = await this.prisma.user.create({
          data: {
            email,
            name,
            phone,
            role: 'CUSTOMER',
            password: null, 
            provider: 'GUEST', 
            providerId: null,
          },
        });
        this.logger.log(`✅ Created guest user: ${guestUser.id}`);
      } else {
        this.logger.log(`✅ Using existing user: ${guestUser.id}`);
        
        if (guestUser.name !== name || guestUser.phone !== phone) {
          await this.prisma.user.update({
            where: { id: guestUser.id },
            data: {
              name: name || guestUser.name,
              phone: phone || guestUser.phone,
            },
          });
          this.logger.log(`✅ Updated user info`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to find/create guest user:', error);
      throw new BadRequestException('Unable to create guest user. Please try again.');
    }

    if (priceBreakdown) {
      this.logger.log('💰 Guest booking with price breakdown:', {
        basePrice: priceBreakdown.basePrice,
        markupAmount: priceBreakdown.markupAmount,
        totalAmount: priceBreakdown.totalAmount,
        currency: priceBreakdown.currency,
      });

      if (priceBreakdown.totalAmount <= 0 || priceBreakdown.basePrice <= 0) {
        throw new BadRequestException('Invalid price breakdown provided');
      }
    }

    const bookDto: BookWakanowFlightDto = {
      passengers: passengers,
      bookingId: bookingId,
      selectData: selectData,
      targetCurrency: targetCurrency,
      priceBreakdown: priceBreakdown,
      isNorthAmerica: isNorthAmerica,
      destinationCode: destinationCode,
    };

    this.logger.log('📤 Calling BookWakanowFlightUseCase...');

    const result = await this.bookWakanowUseCase.execute(bookDto, guestUser.id);

    this.logger.log(`✅ Guest booking completed. Booking: ${result.id}, PNR: ${result.pnr_reference}`);

    return {
      ...result,
      isGuest: true,
      guestEmail: email,
      guestUserId: guestUser.id,
      message: 'Guest booking created. Please complete payment to confirm your flight.',
      requiresPayment: true,
      paymentUrl: `/api/v1/payments/initiate?bookingId=${result.id}`,
      priceBreakdown: result.priceBreakdown || priceBreakdown,
    };
  }

  private validateSelectData(selectData: string): void {
    if (!selectData || selectData.trim().length === 0) {
      throw new BadRequestException('SelectData is required for booking');
    }
    
    if (selectData.trim().length < 10) {
      this.logger.warn(`SelectData too short: ${selectData.length} chars`);
      throw new BadRequestException(
        'Invalid booking data. Please search for flights again and complete the booking promptly.'
      );
    }
    
    this.logger.log(`✅ SelectData validated: ${selectData.length} chars`);
  }
}
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
    this.logger.log(`📋 SelectData length: ${selectData?.length || 0}`);
    this.logger.log(`📍 isNorthAmerica: ${isNorthAmerica}`);


    if (passengers && passengers.length > 0) {
      this.logger.log(`🔍 First passenger passport data:`, {
        firstName: passengers[0].firstName,
        lastName: passengers[0].lastName,
        PassportNumber: passengers[0].PassportNumber,
        ExpiryDate: passengers[0].ExpiryDate,
        PassportIssuingAuthority: passengers[0].PassportIssuingAuthority,
      });
    }


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
      this.logger.log('🔍 Validating passport fields for North America...');
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        if (!p.PassportNumber) {
          this.logger.warn(`❌ Passenger ${i + 1} missing PassportNumber. Full passenger data:`, p);
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

 
    if (priceBreakdown) {
      this.logger.log('💰 Guest booking with price breakdown:', {
        basePrice: priceBreakdown.basePrice,
        markupAmount: priceBreakdown.markupAmount,
        markupPercentage: priceBreakdown.markupPercentage,
        serviceFee: priceBreakdown.serviceFee,
        serviceFeePercentage: priceBreakdown.serviceFeePercentage,
        taxes: priceBreakdown.taxes,
        taxPercentage: priceBreakdown.taxPercentage,
        totalAmount: priceBreakdown.totalAmount,
        currency: priceBreakdown.currency,
      });

      if (priceBreakdown.totalAmount <= 0) {
        throw new BadRequestException('Invalid price breakdown provided');
      }
      if (priceBreakdown.basePrice <= 0) {
        throw new BadRequestException('Invalid price breakdown provided');
      }
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
    let guestUser = null;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        this.logger.log(`Attempt ${attempt}/${maxRetries} to find/create guest user...`);
        
        guestUser = await this.prisma.user.findUnique({
          where: { email },
        });

        if (!guestUser) {
          this.logger.log(`👤 Creating new guest user for ${email}`);
          guestUser = await this.prisma.user.create({
            data: {
              email,
              name: `${leadPassenger.firstName} ${leadPassenger.lastName}`.trim(),
              phone: leadPassenger.phoneNumber || null,
              role: 'CUSTOMER',
              password: null,
              provider: 'GUEST',
              providerId: null,
            },
          });
          this.logger.log(`✅ Created guest user: ${guestUser.id}`);
        } else {
          this.logger.log(`✅ Using existing user: ${guestUser.id}`);
          if (!guestUser.name || guestUser.name !== `${leadPassenger.firstName} ${leadPassenger.lastName}`.trim()) {
            await this.prisma.user.update({
              where: { id: guestUser.id },
              data: {
                name: `${leadPassenger.firstName} ${leadPassenger.lastName}`.trim(),
                phone: leadPassenger.phoneNumber || guestUser.phone,
              },
            });
            this.logger.log(`✅ Updated user info`);
          }
        }
        break;
      } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || '';
        const errorStatus = error?.status || error?.code || 0;

        if ((errorMsg.includes('connection') || 
            errorMsg.includes('timeout') ||
            errorMsg.includes('database') ||
            errorStatus === 500 ||
            errorStatus === 503) && attempt < maxRetries) {
          this.logger.warn(`Attempt ${attempt} failed, retrying in ${1000 * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw error;
      }
    }

    if (!guestUser) {
      throw new BadRequestException('Unable to create guest user. Please try again.');
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

    this.logger.log('📤 Calling BookWakanowFlightUseCase with:');
    this.logger.log(`   Passengers: ${bookDto.passengers.length}`);
    this.logger.log(`   BookingId: ${bookDto.bookingId}`);
    this.logger.log(`   isNorthAmerica: ${bookDto.isNorthAmerica}`);
    this.logger.log(`   First passenger PassportNumber: ${bookDto.passengers[0]?.PassportNumber}`);


    let result = null;
    attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        this.logger.log(`📖 Booking attempt ${attempt}/${maxRetries} for guest...`);
        result = await this.bookWakanowUseCase.execute(bookDto, guestUser.id);
        break;
      } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || '';
        const errorStatus = error?.status || error?.code || 0;

        if (errorMsg.includes('expired') || 
            errorMsg.includes('SELECTION_EXPIRED') ||
            errorMsg.includes('not selected by you') ||
            errorMsg.includes('session expired') ||
            errorMsg.includes('no longer available') ||
            errorMsg.includes('bad request')) {
          this.logger.warn('⚠️ Booking failed due to expired selection, not retrying');
          throw error;
        }

        if ((errorStatus === 500 || errorStatus === 0 || errorStatus === 502 || errorStatus === 503) && attempt < maxRetries) {
          this.logger.warn(`⚠️ Booking attempt ${attempt} failed with ${errorStatus}, retrying in ${1000 * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        throw error;
      }
    }

    if (!result) {
      throw new BadRequestException('Failed to book flight after multiple attempts. Please try again.');
    }

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
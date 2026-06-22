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

  async execute(dto: BookWakanowFlightDto) {

    this.logger.log('📝 Booking Wakanow flight as guest...');
    this.logger.log(`👤 Passengers: ${dto.passengers?.length || 0}`);
    this.logger.log(`🆔 BookingId: ${dto.bookingId}`);
    this.logger.log(`📋 SelectData length: ${dto.selectData?.length || 0}`);
    

    if (dto.priceBreakdown) {
      this.logger.log('💰 Guest booking with price breakdown:', {
        basePrice: dto.priceBreakdown.basePrice,
        markupAmount: dto.priceBreakdown.markupAmount,
        markupPercentage: dto.priceBreakdown.markupPercentage,
        serviceFee: dto.priceBreakdown.serviceFee,
        serviceFeePercentage: dto.priceBreakdown.serviceFeePercentage,
        taxes: dto.priceBreakdown.taxes,
        taxPercentage: dto.priceBreakdown.taxPercentage,
        totalAmount: dto.priceBreakdown.totalAmount,
        currency: dto.priceBreakdown.currency,
      });
    } else {
      this.logger.warn('⚠️ No price breakdown provided for guest booking! Prices will be recalculated.');
    }


    const leadPassenger = dto.passengers?.[0];
    if (!leadPassenger?.email) {
      throw new BadRequestException('Lead passenger email is required for guest bookings');
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
              phone: leadPassenger.phoneNumber,
              role: 'CUSTOMER',
              password: null,
              provider: null,
              providerId: null,
            },
          });
          this.logger.log(`✅ Created guest user: ${guestUser.id}`);
        } else {
          this.logger.log(`✅ Using existing guest user: ${guestUser.id}`);
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
      this.logger.error('❌ All retry attempts to find/create guest user failed');
      throw new BadRequestException('Unable to create guest user. Please try again.');
    }


    if (dto.priceBreakdown) {
      this.logger.log('💰 Passing price breakdown to BookWakanowFlightUseCase');
    }

   
    let result = null;
    attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        this.logger.log(`📖 Booking attempt ${attempt}/${maxRetries} for guest...`);
        result = await this.bookWakanowUseCase.execute(dto, guestUser.id);
        break;
      } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || '';
        const errorStatus = error?.status || error?.code || 0;

        if (errorMsg.includes('expired') || 
            errorMsg.includes('SELECTION_EXPIRED') ||
            errorMsg.includes('not selected by you') ||
            errorMsg.includes('session expired')) {
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
      this.logger.error('❌ All booking retry attempts failed for guest');
      throw new BadRequestException('Failed to book flight after multiple attempts. Please try again.');
    }

    
    this.logger.log(`✅ Guest booking completed. Booking: ${result.id}, PNR: ${result.pnr_reference}`);
    this.logger.log(`💰 Final total: ${result.totalAmount} ${result.currency}`);


    return {
      ...result,
      isGuest: true,
      guestEmail: email,
      message: 'Guest flight booked successfully. Please proceed to payment.',
    };
  }
}
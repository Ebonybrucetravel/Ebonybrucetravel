import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateCarRentalBookingUseCase } from './create-car-rental-booking.use-case';
import { CreateCarRentalBookingDto, PassengerDto } from '@presentation/booking/dto/create-car-rental-booking.dto';

@Injectable()
export class CreateGuestCarRentalBookingUseCase {
  private readonly logger = new Logger(CreateGuestCarRentalBookingUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly createCarRentalBookingUseCase: CreateCarRentalBookingUseCase,
  ) {}

  async execute(dto: CreateCarRentalBookingDto) {
    try {

      const primaryPassenger = this.getPrimaryPassenger(dto);
      const email = primaryPassenger.contact.email.trim().toLowerCase();

      if (!email) {
        throw new BadRequestException('Passenger email is required');
      }

  
      let guestUser = await this.prisma.user.findFirst({
        where: {
          email,
          deletedAt: null,
        },
      });

      if (!guestUser) {
        this.logger.log(`📝 Creating guest user for email: ${email}`);
        
        const fullName = this.getPassengerFullName(primaryPassenger);

        try {
          guestUser = await this.prisma.user.create({
            data: {
              email,
              name: fullName,
              phone: primaryPassenger.contact.phone,
              role: 'CUSTOMER',
              password: null,
              provider: null,
              providerId: null,
            },
          });
          
          this.logger.log(`✅ Guest user created: ${guestUser.id} (${guestUser.email})`);
        } catch (createError: any) {
    
          if (createError.code === 'P2002') {
            this.logger.warn(`⚠️ User ${email} was created by another request. Fetching...`);
            
            guestUser = await this.prisma.user.findFirst({
              where: {
                email,
                deletedAt: null,
              },
            });
            
            if (!guestUser) {
              throw new BadRequestException('Failed to create guest user. Please try again.');
            }
            
            this.logger.log(`✅ Existing user found after race condition: ${guestUser.id}`);
          } else {
            throw createError;
          }
        }
      } else {
        this.logger.log(`✅ Existing user found: ${guestUser.id} (${guestUser.email})`);
        
    
        const fullName = this.getPassengerFullName(primaryPassenger);
        const needsUpdate = 
          guestUser.name !== fullName || 
          guestUser.phone !== primaryPassenger.contact.phone;

        if (needsUpdate) {
          this.logger.log(`ℹ️ Updating user ${guestUser.id} info...`);
          
          guestUser = await this.prisma.user.update({
            where: { id: guestUser.id },
            data: {
              name: fullName,
              phone: primaryPassenger.contact.phone,
           
            },
          });
          
          this.logger.log(`✅ Updated user info for ${guestUser.id}`);
        }
      }

      this.logger.log(`🚀 Creating car rental booking for user: ${guestUser.id}`);
      
      const result = await this.createCarRentalBookingUseCase.execute(dto, guestUser.id);
      
      this.logger.log(`✅ Car rental booking created successfully for guest: ${guestUser.id}`);
      

      return {
        ...result,
        guestUser: {
          id: guestUser.id,
          email: guestUser.email,
          name: guestUser.name,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Error creating guest car rental booking: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        error?.message || 'Failed to create guest car rental booking. Please try again.',
      );
    }
  }

  
  private getPrimaryPassenger(dto: CreateCarRentalBookingDto): PassengerDto {
    if (dto.passengers && dto.passengers.length > 0) {
      return dto.passengers[0];
    }

    if ((dto as any).driver) {
      this.logger.warn('⚠️ Using deprecated "driver" field. Please use "passengers" array instead.');
      
      const driver = (dto as any).driver;
      return {
        name: {
          title: driver.title || 'MR',
          firstName: driver.firstName,
          lastName: driver.lastName,
        },
        contact: {
          phone: driver.phone,
          email: driver.email,
        },
      };
    }


    throw new BadRequestException('At least one passenger is required');
  }

  
  private getPassengerEmail(passenger: PassengerDto): string {
    return passenger.contact.email.trim().toLowerCase();
  }

  private getPassengerFullName(passenger: PassengerDto): string {
    return [
      passenger.name.title,
      passenger.name.firstName,
      passenger.name.lastName,
    ].filter(Boolean).join(' ').trim() || 'Guest';
  }
}
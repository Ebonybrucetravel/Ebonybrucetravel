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
      // ✅ Get primary passenger
      const primaryPassenger = this.getPrimaryPassenger(dto);
      
      // ✅ Normalize email
      const email = primaryPassenger.contact.email.trim().toLowerCase();

      if (!email) {
        throw new BadRequestException('Passenger email is required');
      }

      // ✅ Find existing user (excluding soft-deleted)
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
              // ✅ REMOVED: isGuest: true,
              password: null,
              provider: null,
              providerId: null,
            },
          });
          
          this.logger.log(`✅ Guest user created: ${guestUser.id} (${guestUser.email})`);
        } catch (createError: any) {
          // ✅ Handle race condition - another request might have created the user
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
        
        // ✅ Update user info if needed
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
              // ✅ REMOVED: isGuest: true,
            },
          });
          
          this.logger.log(`✅ Updated user info for ${guestUser.id}`);
        }
      }

      // ✅ Delegate to the authenticated booking use case
      this.logger.log(`🚀 Creating car rental booking for user: ${guestUser.id}`);
      
      const result = await this.createCarRentalBookingUseCase.execute(dto, guestUser.id);
      
      this.logger.log(`✅ Car rental booking created successfully for guest: ${guestUser.id}`);
      
      // ✅ Return with guest user info
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

  /**
   * Get the primary passenger (first passenger in the array)
   * If dto.driver is provided (legacy), convert to passenger format
   */
  private getPrimaryPassenger(dto: CreateCarRentalBookingDto): PassengerDto {
    // ✅ If passengers array exists and has at least one passenger
    if (dto.passengers && dto.passengers.length > 0) {
      return dto.passengers[0];
    }

    // ✅ Legacy support: if driver is provided, convert to passenger
    // Only if your DTO has the driver field
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

    // ✅ No passenger found
    throw new BadRequestException('At least one passenger is required');
  }

  /**
   * Get passenger email
   */
  private getPassengerEmail(passenger: PassengerDto): string {
    return passenger.contact.email.trim().toLowerCase();
  }

  /**
   * Get passenger full name
   */
  private getPassengerFullName(passenger: PassengerDto): string {
    return [
      passenger.name.title,
      passenger.name.firstName,
      passenger.name.lastName,
    ].filter(Boolean).join(' ').trim() || 'Guest';
  }
}
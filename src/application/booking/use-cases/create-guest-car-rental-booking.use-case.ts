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

    const primaryPassenger = this.getPrimaryPassenger(dto);
    

    const email = primaryPassenger.contact.email;


    let guestUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!guestUser) {
      this.logger.log(`Creating guest user for email: ${email}`);
      
      const fullName = [
        primaryPassenger.name.title,
        primaryPassenger.name.firstName,
        primaryPassenger.name.lastName,
      ].filter(Boolean).join(' ').trim() || 'Guest';

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
      
      this.logger.log(`✅ Guest user created: ${guestUser.id}`);
    } else {
      this.logger.log(`✅ Existing guest user found: ${guestUser.id}`);
    }

    // ✅ Delegate to the authenticated booking use case
    return this.createCarRentalBookingUseCase.execute(dto, guestUser.id);
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
    if (dto.driver) {
      this.logger.warn('Using deprecated "driver" field. Please use "passengers" array instead.');
      
      const driver = dto.driver;
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

  private getPassengerEmail(passenger: PassengerDto): string {
    return passenger.contact.email;
  }


  private getPassengerFullName(passenger: PassengerDto): string {
    return [
      passenger.name.title,
      passenger.name.firstName,
      passenger.name.lastName,
    ].filter(Boolean).join(' ').trim() || 'Guest';
  }
}
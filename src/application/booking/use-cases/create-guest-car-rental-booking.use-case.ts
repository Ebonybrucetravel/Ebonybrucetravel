import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateCarRentalBookingUseCase } from './create-car-rental-booking.use-case';
import { CreateCarRentalBookingDto } from '@presentation/booking/dto/create-car-rental-booking.dto';

/**
 * Creates a car rental booking as a guest (no auth).
 * Finds or creates a guest user by driver email, then delegates to CreateCarRentalBookingUseCase.
 * Guest can then pay via POST /payments/amadeus-car-rental/charge-margin/guest (reference + email).
 */
@Injectable()
export class CreateGuestCarRentalBookingUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createCarRentalBookingUseCase: CreateCarRentalBookingUseCase,
  ) {}

  async execute(dto: CreateCarRentalBookingDto) {
    const email = dto.driver.email;

    let guestUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!guestUser) {
      guestUser = await this.prisma.user.create({
        data: {
          email,
          name: [dto.driver.title, dto.driver.firstName, dto.driver.lastName].filter(Boolean).join(' ').trim() || 'Guest',
          phone: dto.driver.phone,
          role: 'CUSTOMER',
          password: null,
          provider: null,
          providerId: null,
        },
      });
    }

    return this.createCarRentalBookingUseCase.execute(dto, guestUser.id);
  }
}

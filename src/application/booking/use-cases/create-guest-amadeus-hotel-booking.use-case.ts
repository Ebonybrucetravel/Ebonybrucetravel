import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateAmadeusHotelBookingUseCase } from './create-amadeus-hotel-booking.use-case';
import { CreateAmadeusHotelBookingDto } from '@presentation/booking/dto/create-amadeus-hotel-booking.dto';

/**
 * Creates an Amadeus hotel booking as a guest (no auth).
 * Finds or creates a guest user by lead guest email, then delegates to CreateAmadeusHotelBookingUseCase.
 * Guest can then pay via create-intent/guest (reference + email) or charge-margin/guest.
 */
@Injectable()
export class CreateGuestAmadeusHotelBookingUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createAmadeusHotelBookingUseCase: CreateAmadeusHotelBookingUseCase,
  ) {}

  async execute(dto: CreateAmadeusHotelBookingDto) {
    const leadGuest = dto.guests[0];
    const email = leadGuest.contact.email;

    let guestUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!guestUser) {
      guestUser = await this.prisma.user.create({
        data: {
          email,
          name: `${leadGuest.name.firstName} ${leadGuest.name.lastName}`.trim(),
          phone: leadGuest.contact.phone,
          role: 'CUSTOMER',
          password: null,
          provider: null,
          providerId: null,
        },
      });
    }

    return this.createAmadeusHotelBookingUseCase.execute(dto, guestUser.id);
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BookWakanowFlightUseCase } from './book-wakanow-flight.use-case';
import { BookWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

@Injectable()
export class BookWakanowFlightGuestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookWakanowUseCase: BookWakanowFlightUseCase,
  ) {}

  async execute(dto: BookWakanowFlightDto) {
    const leadPassenger = dto.passengers?.[0];
    if (!leadPassenger?.email) {
      throw new BadRequestException('Lead passenger email is required for guest bookings');
    }

    const email = leadPassenger.email.toLowerCase().trim();

    let guestUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!guestUser) {
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
    }

    return this.bookWakanowUseCase.execute(dto, guestUser.id);
  }
}

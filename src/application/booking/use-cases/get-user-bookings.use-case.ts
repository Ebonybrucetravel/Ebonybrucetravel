import { Injectable, Logger, Inject } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';

@Injectable()
export class GetUserBookingsUseCase {
  private readonly logger = new Logger(GetUserBookingsUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(userId: string) {
    this.logger.log(`Getting bookings for user ${userId}`);
    
    const bookings = await this.bookingRepository.findByUserId(userId);
    
    // Sort by createdAt descending (newest first)
    return bookings.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
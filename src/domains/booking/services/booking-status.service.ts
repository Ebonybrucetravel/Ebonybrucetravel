import { Injectable } from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class BookingStatusService {
  /**
   * Check if a status transition is valid
   */
  canTransition(from: BookingStatus, to: BookingStatus): boolean {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.PAYMENT_PENDING,
        BookingStatus.CANCELLED,
        BookingStatus.FAILED,
      ],
      [BookingStatus.PAYMENT_PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.FAILED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.CONFIRMED]: [BookingStatus.CANCELLED, BookingStatus.REFUNDED],
      [BookingStatus.CANCELLED]: [BookingStatus.REFUNDED],
      [BookingStatus.REFUNDED]: [],
      [BookingStatus.FAILED]: [BookingStatus.PENDING],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Determine booking status based on payment status
   */
  getStatusFromPaymentStatus(paymentStatus: PaymentStatus): BookingStatus {
    switch (paymentStatus) {
      case PaymentStatus.COMPLETED:
        return BookingStatus.CONFIRMED;
      case PaymentStatus.FAILED:
        return BookingStatus.FAILED;
      case PaymentStatus.PENDING:
      case PaymentStatus.PROCESSING:
        return BookingStatus.PAYMENT_PENDING;
      case PaymentStatus.REFUNDED:
      case PaymentStatus.PARTIALLY_REFUNDED:
        return BookingStatus.REFUNDED;
      default:
        return BookingStatus.PENDING;
    }
  }
}


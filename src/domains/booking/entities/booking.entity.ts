import { BookingStatus, PaymentStatus, ProductType, Provider } from '@prisma/client';

export class Booking {
  id: string;
  reference: string;
  userId: string;
  productType: ProductType;
  status: BookingStatus;
  provider: Provider;
  providerBookingId?: string;
  providerData?: any;
  basePrice: number;
  markupAmount: number;
  serviceFee: number;
  totalAmount: number;
  currency: string;
  bookingData: any;
  passengerInfo?: any;
  paymentInfo?: any;
  paymentStatus: PaymentStatus;
  paymentProvider?: string;
  paymentReference?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  refundAmount?: number;
  refundStatus?: string;
  // Dispute evidence & cancellation (BOOKING_OPERATIONS_AND_RISK)
  cancellationDeadline?: Date;
  cancellationPolicySnapshot?: string;
  clientIp?: string;
  userAgent?: string;
  policyAcceptedAt?: Date;
  stripeChargeId?: string;
  confirmationEmailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

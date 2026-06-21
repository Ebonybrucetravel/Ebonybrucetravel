import { BookingStatus, PaymentStatus, ProductType, Provider, RefundStatus } from '@prisma/client';

export class Booking {
  id: string;
  reference: string;
  userId: string;
  productType: ProductType;
  status: BookingStatus;
  provider: Provider;
  providerBookingId?: string;
  providerData?: any;
  
  // ✅ Price breakdown fields
  basePrice: number;
  markupAmount: number;
  markupPercentage: number;
  serviceFee: number;
  serviceFeePercentage: number;
  taxes: number;
  taxPercentage: number;
  totalAmount: number;
  currency: string;
  
  bookingData: any;
  passengerInfo?: any;
  paymentInfo?: any;
  paymentStatus: PaymentStatus;
  paymentProvider?: string;
  paymentReference?: string;
  
  // ✅ Provider-specific fields
  bookingId?: string;
  selectData?: string;
  
  // ✅ Guest booking flag
  isGuest?: boolean;
  
  // ✅ Voucher fields (for loyalty program)
  voucherId?: string;
  voucherCode?: string;
  voucherDiscount?: number;
  finalAmount?: number;
  
  // Cancellation/Refund
  cancelledAt?: Date;
  cancelledBy?: string;
  refundAmount?: number;
  refundStatus?: RefundStatus;
  
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
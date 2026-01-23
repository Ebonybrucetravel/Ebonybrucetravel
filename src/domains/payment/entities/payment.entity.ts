export class Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  provider: 'STRIPE' | 'PAYSTACK';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  providerTransactionId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, RefundStatus } from '@prisma/client';
import { retryWithBackoffAndLogging } from '@common/utils/retry.util';
import { ResendService } from '@infrastructure/email/resend.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class CancelDuffelOrderUseCase {
  private readonly logger = new Logger(CancelDuffelOrderUseCase.name);

  constructor(
    private readonly duffelService: DuffelService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly resendService: ResendService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(bookingId: string, userId?: string, isAdmin: boolean = true): Promise<{
    cancellationId: string;
    cancellationData: any;
    refundAmount?: number;
    refundTo?: string;
    hasAirlineCredits: boolean;
    airlineCredits?: any[];
  }> {
    // Get booking from database
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found.`);
    }

    // Check if booking is already cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled.');
    }

    // Check if booking has a Duffel order
    if (!booking.providerBookingId) {
      throw new BadRequestException(
        'Booking does not have a Duffel order. Cannot cancel an order that does not exist.',
      );
    }

    // Only allow cancellation if booking is confirmed
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel booking with status ${booking.status}. Only confirmed bookings can be cancelled.`,
      );
    }

    // ============================================
    // CANCELLATION RESTRICTIONS (Admin Override)
    // ============================================

    // 1. Time-Based Restriction: No cancellations within 24 hours of departure
    const departureDate = this.extractDepartureDate(booking);
    if (departureDate) {
      const hoursUntilDeparture = (departureDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      const MIN_HOURS_BEFORE_DEPARTURE = 24; // 24 hours restriction

      if (hoursUntilDeparture < MIN_HOURS_BEFORE_DEPARTURE && hoursUntilDeparture > 0) {
        throw new BadRequestException(
          `Cancellations are not allowed within ${MIN_HOURS_BEFORE_DEPARTURE} hours of departure. ` +
          `Departure is in ${Math.round(hoursUntilDeparture)} hours. ` +
          `Please contact support for emergency cancellations.`,
        );
      }

      if (hoursUntilDeparture <= 0) {
        throw new BadRequestException(
          'Cannot cancel a booking after the departure time has passed.',
        );
      }
    }

    // 2. Non-Refundable Fare Check: Block cancellations for non-refundable fares
    const offerConditions = (booking.providerData as any)?.offerConditions || 
                           (booking.bookingData as any)?.conditions;
    
    if (offerConditions?.refund_before_departure?.allowed === false) {
      throw new BadRequestException(
        'This booking uses a non-refundable fare. Cancellations are not allowed. ' +
        'The airline does not permit refunds for this fare type.',
      );
    }

    // 3. Check if cancellation is allowed by airline (from offer conditions)
    if (offerConditions?.refund_before_departure === null || 
        offerConditions?.refund_before_departure === undefined) {
      // If conditions are not available, log warning but allow (admin can override)
      this.logger.warn(
        `Cancellation conditions not available for booking ${bookingId}. Proceeding with admin override.`,
      );
    }

    try {
      // Create pending cancellation with retry logic
      this.logger.log(`Creating pending cancellation for Duffel order ${booking.providerBookingId}...`);
      const cancellation = await retryWithBackoffAndLogging(
        () => this.duffelService.createOrderCancellation(booking.providerBookingId!),
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          maxDelayMs: 10000,
          logger: this.logger,
          context: `Creating cancellation for order ${booking.providerBookingId}`,
        },
      );

      // Check if cancellation has expired
      if (cancellation.expires_at) {
        const expiresAt = new Date(cancellation.expires_at);
        if (expiresAt < new Date()) {
          throw new BadRequestException(
            `Cancellation has expired. Please create a new cancellation request.`,
          );
        }
      }

      // Log cancellation details before confirming
      this.logger.log(`Cancellation details:`, {
        id: cancellation.id,
        refund_amount: cancellation.refund_amount,
        refund_currency: cancellation.refund_currency,
        refund_to: cancellation.refund_to,
        airline_credits: cancellation.airline_credits?.length || 0,
        expires_at: cancellation.expires_at,
      });

      // Confirm the cancellation with retry logic
      this.logger.log(`Confirming cancellation ${cancellation.id}...`);
      const confirmedCancellation = await retryWithBackoffAndLogging(
        () => this.duffelService.confirmOrderCancellation(cancellation.id),
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          maxDelayMs: 10000,
          logger: this.logger,
          context: `Confirming cancellation ${cancellation.id}`,
        },
      );

      // Extract refund information - handle different refund types
      const refundTo = confirmedCancellation.refund_to;
      let refundAmount: number | undefined;
      let hasAirlineCredits = false;

      // NOTE: Airline credits are vouchers issued by the AIRLINE (not us) when they cancel/change flights
      // These are NOT loyalty points or wallet balance - they're airline-specific vouchers
      // We just store this info to inform the customer - we don't manage or track credits
      
      // Check if refund goes to airline credits instead of cash
      if (refundTo === 'airline_credits') {
        hasAirlineCredits = true;
        this.logger.log(
          `Cancellation resulted in airline credits (vouchers) instead of cash refund. Customer must use these credits directly with the airline.`,
        );
        // Store airline credits information but no cash refund
        refundAmount = undefined;
      } else if (confirmedCancellation.refund_amount) {
        // Cash refund (goes to Duffel balance, card, or voucher)
        refundAmount = parseFloat(confirmedCancellation.refund_amount);
        this.logger.log(
          `Refund amount: ${refundAmount} ${confirmedCancellation.refund_currency} (refund_to: ${refundTo})`,
        );
      }

      // Update booking status with comprehensive cancellation data
      await this.bookingRepository.update(bookingId, {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        refundAmount: refundAmount,
        refundStatus: hasAirlineCredits
          ? undefined // No refund status for airline credits
          : refundAmount
            ? RefundStatus.PENDING // Will need to manually refund customer via Stripe
            : undefined,
        providerData: {
          ...(booking.providerData as any),
          cancellationId: confirmedCancellation.id,
          cancellationData: confirmedCancellation,
          cancelledAt: new Date().toISOString(),
          refundTo: refundTo, // Store where refund goes
          airlineCredits: hasAirlineCredits ? confirmedCancellation.airline_credits : undefined,
          refundCurrency: confirmedCancellation.refund_currency,
          // Note: 
          // - If refund_to is "balance", refund goes to Duffel balance → you need to manually refund customer via Stripe
          // - If refund_to is "airline_credits", airline issued vouchers → customer uses these directly with the airline (we don't manage them)
        },
      });

      this.logger.log(
        `Successfully cancelled Duffel order ${booking.providerBookingId} for booking ${bookingId}`,
      );

      // Send cancellation email to customer
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: booking.userId },
          select: { email: true, name: true },
        });

        if (user && user.email) {
          await this.resendService.sendCancellationEmail({
            to: user.email,
            customerName: user.name || 'Valued Customer',
            bookingReference: booking.reference,
            refundAmount,
            refundCurrency: confirmedCancellation.refund_currency,
            refundTo: refundTo,
            hasAirlineCredits,
            airlineCredits: hasAirlineCredits ? confirmedCancellation.airline_credits : undefined,
            cancellationDate: new Date(),
          });
        }
      } catch (emailError) {
        // Don't fail cancellation if email fails
        this.logger.error(`Failed to send cancellation email:`, emailError);
      }

      return {
        cancellationId: confirmedCancellation.id,
        cancellationData: confirmedCancellation,
        refundAmount,
        refundTo: refundTo,
        hasAirlineCredits,
        airlineCredits: hasAirlineCredits ? confirmedCancellation.airline_credits : undefined,
        // Note: 
        // - If refund_to is "balance", refund goes to Duffel balance → manually refund customer via Stripe
        // - If refund_to is "airline_credits", airline issued vouchers → customer uses directly with airline
      };
    } catch (error) {
      this.logger.error(`Failed to cancel Duffel order for booking ${bookingId}:`, error);

      // Update booking to indicate cancellation failed
      await this.bookingRepository.update(bookingId, {
        providerData: {
          ...(booking.providerData as any),
          cancellationError: error instanceof Error ? error.message : 'Unknown error',
          cancellationFailedAt: new Date().toISOString(),
        },
      });

      throw error;
    }
  }

  /**
   * Extract departure date from booking data
   * Looks in providerData (Duffel order) or bookingData (offer)
   */
  private extractDepartureDate(booking: any): Date | null {
    try {
      // Try to get from providerData (Duffel order)
      const duffelOrder = (booking.providerData as any)?.duffelOrder;
      if (duffelOrder?.slices?.[0]?.segments?.[0]?.departing_at) {
        return new Date(duffelOrder.slices[0].segments[0].departing_at);
      }

      // Try to get from bookingData (offer data)
      const offerData = booking.bookingData as any;
      if (offerData?.slices?.[0]?.segments?.[0]?.departing_at) {
        return new Date(offerData.slices[0].segments[0].departing_at);
      }

      // Try to get from providerData offer
      const providerOffer = (booking.providerData as any)?.offer;
      if (providerOffer?.slices?.[0]?.segments?.[0]?.departing_at) {
        return new Date(providerOffer.slices[0].segments[0].departing_at);
      }

      // If no departure date found, return null (restriction won't apply)
      this.logger.warn(`Could not extract departure date for booking ${booking.id}. Time restriction will not apply.`);
      return null;
    } catch (error) {
      this.logger.error(`Error extracting departure date for booking ${booking.id}:`, error);
      return null;
    }
  }
}


import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { CreatePaymentIntentUseCase } from '@application/payment/use-cases/create-payment-intent.use-case';
import { CreateGuestPaymentIntentUseCase } from '@application/payment/use-cases/create-guest-payment-intent.use-case';
import { HandleStripeWebhookUseCase } from '@application/payment/use-cases/handle-stripe-webhook.use-case';
import { ChargeAmadeusHotelMarginUseCase } from '@application/payment/use-cases/charge-amadeus-hotel-margin.use-case';
import { ChargeAmadeusCarRentalMarginUseCase } from '@application/payment/use-cases/charge-amadeus-car-rental-margin.use-case';
import { StripeService } from '@domains/payment/services/stripe.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateGuestPaymentIntentDto } from './dto/create-guest-payment-intent.dto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly createPaymentIntentUseCase: CreatePaymentIntentUseCase,
    private readonly createGuestPaymentIntentUseCase: CreateGuestPaymentIntentUseCase,
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
    private readonly chargeAmadeusHotelMarginUseCase: ChargeAmadeusHotelMarginUseCase,
    private readonly chargeAmadeusCarRentalMarginUseCase: ChargeAmadeusCarRentalMarginUseCase,
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('stripe/create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Stripe payment intent for a booking (user or admin on behalf)',
    description:
      'User: own booking. Admin: any booking ID to pay on behalf. Voucher is applied for the booking owner.',
  })
  @ApiBody({ type: CreatePaymentIntentDto })
  async createPaymentIntent(@Request() req: any, @Body() dto: CreatePaymentIntentDto) {
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    let userId = req.user.id;
    if (isAdmin) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
        select: { userId: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      userId = booking.userId;
    }
    return this.createPaymentIntentUseCase.execute(dto.bookingId, dto.voucherCode, userId);
  }

  @Post('amadeus-hotel/charge-margin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'One-step Amadeus hotel payment (server-side, authenticated or admin on behalf)',
    description:
      'After creating an Amadeus hotel booking with card, call this to charge the margin. Admin can pass any booking ID to pay on behalf.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bookingId'],
      properties: { bookingId: { type: 'string' } },
    },
  })
  async chargeAmadeusHotelMargin(@Request() req: any, @Body() body: { bookingId: string }) {
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    let userId = req.user.id;
    if (isAdmin) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: body.bookingId },
        select: { userId: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      userId = booking.userId;
    }
    return this.chargeAmadeusHotelMarginUseCase.execute(body.bookingId, userId);
  }

  @Post('amadeus-hotel/charge-margin/guest')
  @Public()
  @ApiOperation({
    summary: 'One-step Amadeus hotel payment (guest, no authentication)',
    description:
      'For guest Amadeus hotel bookings. Call with booking reference and email (must match lead guest). ' +
      'Creates the Amadeus order and charges the margin via Stripe with the stored card. One card entry.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bookingReference', 'email'],
      properties: {
        bookingReference: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    },
  })
  async chargeAmadeusHotelMarginGuest(@Body() body: { bookingReference: string; email: string }) {
    return this.chargeAmadeusHotelMarginUseCase.executeByReferenceAndEmail(
      body.bookingReference,
      body.email,
    );
  }

  @Post('amadeus-car-rental/charge-margin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'One-step Amadeus car rental payment (server-side, authenticated or admin on behalf)',
    description:
      'After creating a car rental booking with card (POST /bookings/car-rentals/bookings), ' +
      'call this to create the Amadeus transfer order and charge the margin via Stripe. Admin can pass any booking ID to pay on behalf.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bookingId'],
      properties: { bookingId: { type: 'string' } },
    },
  })
  async chargeAmadeusCarRentalMargin(@Request() req: any, @Body() body: { bookingId: string }) {
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    let userId = req.user.id;
    if (isAdmin) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: body.bookingId },
        select: { userId: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      userId = booking.userId;
    }
    return this.chargeAmadeusCarRentalMarginUseCase.execute(body.bookingId, userId);
  }

  @Post('amadeus-car-rental/charge-margin/guest')
  @Public()
  @ApiOperation({
    summary: 'One-step Amadeus car rental payment (guest, no authentication)',
    description:
      'For guest car rental bookings. Call with booking reference and email (must match driver email). ' +
      'Creates the Amadeus transfer order and charges the margin via Stripe with the stored card. One card entry.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bookingReference', 'email'],
      properties: {
        bookingReference: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    },
  })
  async chargeAmadeusCarRentalMarginGuest(
    @Body() body: { bookingReference: string; email: string },
  ) {
    return this.chargeAmadeusCarRentalMarginUseCase.executeByReferenceAndEmail(
      body.bookingReference,
      body.email,
    );
  }

  @Post('stripe/create-intent/guest')
  @Public()
  @ApiOperation({
    summary: 'Create Stripe payment intent for a guest booking (no authentication)',
    description:
      'Guest checkout flow using booking reference + passenger email. ' +
      'This is an industry-standard pattern for secure guest payments.',
  })
  @ApiBody({ type: CreateGuestPaymentIntentDto })
  async createGuestPaymentIntent(@Body() dto: CreateGuestPaymentIntentDto) {
    return this.createGuestPaymentIntentUseCase.execute(dto.bookingReference, dto.email);
  }

  @Post('stripe/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook endpoint (handles payment events)',
    description:
      'In development/test mode, you can bypass signature verification by including a test flag in the body or header. ' +
      'For production, proper Stripe webhook signatures are required.',
  })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Body() body: any,
  ) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isTestMode =
      body._testMode === true ||
      req.headers['x-test-mode'] === 'true' ||
      req.headers['x-bypass-signature'] === 'true';

    // In development/test mode, allow bypassing signature verification for testing
    if (isDevelopment && isTestMode) {
      // ⚠️ IMPORTANT: Test mode bypasses signature verification
      // However, the webhook handler will STILL verify payment intent status with Stripe
      // If the payment intent is "incomplete" or hasn't been charged, the booking will NOT be marked as successful
      // This prevents false positives - you must actually complete the payment in Stripe for the booking to succeed

      // Create a mock Stripe event from the body for testing
      // Ensure the event structure matches Stripe's format
      const event = {
        id: body.id || `evt_test_${Date.now()}`,
        type: body.type || 'payment_intent.succeeded',
        data: {
          object: {
            ...body.data?.object,
            // Ensure test mode events include proper structure
            status: body.data?.object?.status || 'succeeded',
            metadata: body.data?.object?.metadata || {},
          },
        },
        created: body.created || Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        api_version: '2023-10-16',
      } as any;

      await this.handleStripeWebhookUseCase.execute(event);
      return {
        received: true,
        testMode: true,
        warning:
          '⚠️ Test mode: Payment intent will be verified with Stripe. ' +
          'If payment status is not "succeeded" or has no charges, booking will NOT be marked as successful. ' +
          'Complete the payment in Stripe Dashboard first, then retry this webhook.',
      };
    }

    // Production mode: require proper signature verification
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    // Verify webhook signature
    const event = this.stripeService.verifyWebhookSignature(req.rawBody!, signature);

    // Handle the webhook event
    await this.handleStripeWebhookUseCase.execute(event);

    return { received: true };
  }
}

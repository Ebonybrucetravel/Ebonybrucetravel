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
import { HandleStripeWebhookUseCase } from '@application/payment/use-cases/handle-stripe-webhook.use-case';
import { StripeService } from '@domains/payment/services/stripe.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly createPaymentIntentUseCase: CreatePaymentIntentUseCase,
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
    private readonly stripeService: StripeService,
  ) {}

  @Post('stripe/create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe payment intent for a booking' })
  @ApiBody({ type: CreatePaymentIntentDto })
  async createPaymentIntent(@Request() req, @Body() dto: CreatePaymentIntentDto) {
    return this.createPaymentIntentUseCase.execute(dto.bookingId);
  }

  @Post('stripe/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (handles payment events)' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    // Verify webhook signature
    const event = this.stripeService.verifyWebhookSignature(
      req.rawBody!,
      signature,
    );

    // Handle the webhook event
    await this.handleStripeWebhookUseCase.execute(event);

    return { received: true };
  }
}

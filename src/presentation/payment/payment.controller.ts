import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  @Post('create-intent')
  @ApiOperation({ summary: 'Create payment intent' })
  async createPaymentIntent(@Body() body: any) {
    // TODO: Implement payment intent creation
    return {};
  }
}


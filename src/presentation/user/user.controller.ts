import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import * as requestIp from 'request-ip';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { LoyaltyService } from '@domains/loyalty/loyalty.service';
import { SavedPaymentMethodService } from '@domains/payment/services/saved-payment-method.service';
import { SavedItemsService } from '@domains/saved-items/saved-items.service';
import { SavedTravelersService } from '@domains/saved-travelers/saved-travelers.service';
import { VoucherService } from '@domains/loyalty/voucher.service';
import { SaveItemDto, UpdateSavedItemNotesDto, ToggleSaveItemDto, CheckSavedDto } from './dto/save-item.dto';
import { CreateSavedTravelerDto, UpdateSavedTravelerDto, GetTravelersByIdsDto } from './dto/saved-traveler.dto';
import { RedeemPointsDto, TransactionHistoryQueryDto, ConfirmPaymentMethodDto, ValidateVoucherDto } from './dto/loyalty.dto';
import { ProductType } from '@prisma/client';

@ApiTags('User Profile')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly loyaltyService: LoyaltyService,
    private readonly voucherService: VoucherService,
    private readonly savedPaymentMethodService: SavedPaymentMethodService,
    private readonly savedItemsService: SavedItemsService,
    private readonly savedTravelersService: SavedTravelersService,
  ) {}

  // =====================================================
  // PROFILE
  // =====================================================

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: ProfileResponseDto })
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    return this.userService.getProfile(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: ProfileResponseDto })
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto): Promise<ProfileResponseDto> {
    return this.userService.updateProfile(req.user.id, updateDto);
  }

  @Put('me/avatar')
  @ApiOperation({ summary: 'Upload user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Profile image uploaded successfully', type: ProfileResponseDto })
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ProfileResponseDto> {
    return this.userService.uploadAvatar(req.user.id, file);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(@Request() req, @Req() request: any, @Body() changePasswordDto: ChangePasswordDto) {
    const ipAddress = requestIp.getClientIp(request) || 'Unknown';
    const userAgent = request.headers['user-agent'] || 'Unknown';
    
    await this.userService.changePassword(req.user.id, changePasswordDto, ipAddress, userAgent);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(@Request() req, @Req() request: any) {
    const ipAddress = requestIp.getClientIp(request) || 'Unknown';
    const userAgent = request.headers['user-agent'] || 'Unknown';
    
    await this.userService.deleteAccount(req.user.id, ipAddress, userAgent);
    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  // =====================================================
  // LOYALTY POINTS & REWARDS
  // =====================================================

  @Get('me/loyalty')
  @ApiOperation({ summary: 'Get loyalty points summary (balance, tier, recent transactions)' })
  @ApiResponse({ status: 200, description: 'Loyalty summary retrieved' })
  async getLoyaltySummary(@Request() req) {
    const summary = await this.loyaltyService.getLoyaltySummary(req.user.id);
    return {
      success: true,
      data: summary,
      message: 'Loyalty summary retrieved successfully',
    };
  }

  @Get('me/loyalty/transactions')
  @ApiOperation({ summary: 'Get loyalty points transaction history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['EARN', 'REDEEM', 'ADMIN_CREDIT', 'ADMIN_DEBIT', 'EXPIRY', 'BONUS'] })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved' })
  async getTransactionHistory(@Request() req, @Query() query: TransactionHistoryQueryDto) {
    const result = await this.loyaltyService.getTransactionHistory(req.user.id, query);
    return {
      success: true,
      ...result,
      message: 'Transaction history retrieved successfully',
    };
  }

  @Get('me/loyalty/available-rewards')
  @ApiOperation({ summary: 'Get available reward rules the user can redeem' })
  @ApiResponse({ status: 200, description: 'Available rewards retrieved' })
  async getAvailableRewards(@Request() req) {
    const account = await this.loyaltyService.getOrCreateAccount(req.user.id);
    const { LoyaltyTier } = await import('@prisma/client');

    // Build OR conditions with proper enum types
    const orConditions: any[] = [
      { requiredTier: null },
      { requiredTier: account.tier as any },
    ];
    if (account.tier === 'PLATINUM') {
      orConditions.push({ requiredTier: 'GOLD' as any }, { requiredTier: 'SILVER' as any });
    } else if (account.tier === 'GOLD') {
      orConditions.push({ requiredTier: 'SILVER' as any });
    }

    const rules = await this.loyaltyService['prisma'].rewardRule.findMany({
      where: {
        isActive: true,
        OR: orConditions,
      },
      orderBy: { pointsRequired: 'asc' },
    });

    return {
      success: true,
      data: rules.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        pointsRequired: r.pointsRequired,
        discountType: r.discountType,
        discountValue: Number(r.discountValue),
        currency: r.currency,
        maxDiscountAmount: r.maxDiscountAmount ? Number(r.maxDiscountAmount) : null,
        applicableProducts: r.applicableProducts,
        requiredTier: r.requiredTier,
        canRedeem: account.balance >= r.pointsRequired,
      })),
      message: 'Available rewards retrieved successfully',
    };
  }

  @Post('me/loyalty/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem loyalty points for a voucher' })
  @ApiResponse({ status: 200, description: 'Points redeemed successfully, voucher generated' })
  @ApiResponse({ status: 400, description: 'Insufficient points or ineligible' })
  async redeemPoints(@Request() req, @Body() dto: RedeemPointsDto) {
    const result = await this.loyaltyService.redeemPointsForVoucher(req.user.id, dto.rewardRuleId);
    return {
      success: true,
      data: result,
      message: 'Points redeemed successfully! Your voucher has been generated.',
    };
  }

  @Get('me/vouchers')
  @ApiOperation({ summary: 'Get user\'s vouchers' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'] })
  @ApiResponse({ status: 200, description: 'Vouchers retrieved' })
  async getMyVouchers(@Request() req, @Query('status') status?: string) {
    const where: any = { userId: req.user.id };
    if (status) where.status = status;

    const vouchers = await this.loyaltyService['prisma'].voucher.findMany({
      where,
      include: { rewardRule: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: vouchers.map((v: any) => ({
        id: v.id,
        code: v.code,
        rewardName: v.rewardRule.name,
        discountType: v.discountType,
        discountValue: Number(v.discountValue),
        currency: v.currency,
        maxDiscountAmount: v.maxDiscountAmount ? Number(v.maxDiscountAmount) : null,
        applicableProducts: v.applicableProducts,
        minBookingAmount: v.minBookingAmount ? Number(v.minBookingAmount) : null,
        status: v.status,
        expiresAt: v.expiresAt,
        usedAt: v.usedAt,
        createdAt: v.createdAt,
      })),
      message: 'Vouchers retrieved successfully',
    };
  }

  @Post('me/vouchers/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a voucher code for a booking',
    description: 'Validates voucher code and calculates discount. Use this before creating payment intent.',
  })
  @ApiResponse({ status: 200, description: 'Voucher validated and discount calculated' })
  @ApiResponse({ status: 400, description: 'Invalid voucher or not applicable' })
  async validateVoucher(@Request() req, @Body() dto: ValidateVoucherDto) {
    const result = await this.voucherService.applyVoucher(
      dto.voucherCode,
      req.user.id,
      dto.productType,
      dto.bookingAmount,
      dto.currency,
    );
    return {
      success: true,
      data: result,
      message: 'Voucher validated successfully',
    };
  }

  @Get('me/vouchers/:code')
  @ApiOperation({ summary: 'Get voucher details by code' })
  @ApiParam({ name: 'code', description: 'Voucher code' })
  @ApiResponse({ status: 200, description: 'Voucher details retrieved' })
  async getVoucherDetails(@Request() req, @Param('code') code: string) {
    const voucher = await this.voucherService.getVoucherDetails(code, req.user.id);
    return {
      success: true,
      data: voucher,
      message: 'Voucher details retrieved successfully',
    };
  }

  // =====================================================
  // SAVED PAYMENT METHODS
  // =====================================================

  @Post('me/payment-methods/setup')
  @ApiOperation({
    summary: 'Create a SetupIntent to save a new card',
    description: 'Returns a clientSecret to use with Stripe.js on the frontend. The frontend collects card details securely via Stripe Elements - we never handle raw card data.',
  })
  @ApiResponse({ status: 201, description: 'SetupIntent created' })
  async createSetupIntent(@Request() req) {
    const result = await this.savedPaymentMethodService.createSetupIntent(req.user.id);
    return {
      success: true,
      data: result,
      message: 'Use the clientSecret with Stripe.js to securely save your card',
    };
  }

  @Post('me/payment-methods/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm and save payment method after SetupIntent completion',
    description: 'Call this after the frontend confirms the SetupIntent via Stripe.js',
  })
  @ApiResponse({ status: 200, description: 'Payment method saved' })
  async confirmPaymentMethod(@Request() req, @Body() dto: ConfirmPaymentMethodDto) {
    const result = await this.savedPaymentMethodService.confirmAndSavePaymentMethod(
      req.user.id,
      dto.setupIntentId,
      dto.cardholderName,
    );
    return {
      success: true,
      data: result,
      message: 'Payment method saved successfully',
    };
  }

  @Get('me/payment-methods')
  @ApiOperation({ summary: 'List saved payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved' })
  async listPaymentMethods(@Request() req) {
    const methods = await this.savedPaymentMethodService.listPaymentMethods(req.user.id);
    return {
      success: true,
      data: methods,
      message: 'Payment methods retrieved successfully',
    };
  }

  @Patch('me/payment-methods/:id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a payment method as default' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({ status: 200, description: 'Default payment method updated' })
  async setDefaultPaymentMethod(@Request() req, @Param('id') id: string) {
    const result = await this.savedPaymentMethodService.setDefault(req.user.id, id);
    return { success: true, ...result };
  }

  @Delete('me/payment-methods/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a saved payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({ status: 200, description: 'Payment method removed' })
  async removePaymentMethod(@Request() req, @Param('id') id: string) {
    const result = await this.savedPaymentMethodService.removePaymentMethod(req.user.id, id);
    return { success: true, ...result };
  }

  // =====================================================
  // SAVED ITEMS / WISHLIST
  // =====================================================

  @Post('me/saved-items')
  @ApiOperation({ summary: 'Save an item to wishlist' })
  @ApiResponse({ status: 201, description: 'Item saved to wishlist' })
  @ApiResponse({ status: 409, description: 'Item already saved' })
  async saveItem(@Request() req, @Body() dto: SaveItemDto) {
    const item = await this.savedItemsService.saveItem(req.user.id, dto);
    return {
      success: true,
      data: item,
      message: 'Item saved to wishlist',
    };
  }

  @Get('me/saved-items')
  @ApiOperation({ summary: 'Get saved items / wishlist' })
  @ApiQuery({ name: 'productType', required: false, enum: ['FLIGHT_DOMESTIC', 'FLIGHT_INTERNATIONAL', 'HOTEL', 'CAR_RENTAL'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Saved items retrieved' })
  async getSavedItems(
    @Request() req,
    @Query('productType') productType?: ProductType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.savedItemsService.getSavedItems(req.user.id, {
      productType,
      page,
      limit,
    });
    return {
      success: true,
      ...result,
      message: 'Saved items retrieved successfully',
    };
  }

  @Get('me/saved-items/counts')
  @ApiOperation({ summary: 'Get saved items count per product type' })
  @ApiResponse({ status: 200, description: 'Saved items counts retrieved' })
  async getSavedItemsCounts(@Request() req) {
    const counts = await this.savedItemsService.getSavedItemsCounts(req.user.id);
    return {
      success: true,
      data: counts,
      message: 'Saved items counts retrieved successfully',
    };
  }

  @Post('me/saved-items/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle save/unsave an item (requires providerId)' })
  @ApiResponse({ status: 200, description: 'Item toggled' })
  async toggleSaveItem(@Request() req, @Body() dto: ToggleSaveItemDto) {
    const result = await this.savedItemsService.toggleSave(req.user.id, dto);
    return { success: true, ...result };
  }

  @Post('me/saved-items/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if an item is saved (for UI heart/save toggle)' })
  @ApiResponse({ status: 200, description: 'Check result returned' })
  async checkItemSaved(@Request() req, @Body() dto: CheckSavedDto) {
    const isSaved = await this.savedItemsService.isItemSaved(
      req.user.id,
      dto.productType,
      dto.providerId,
    );
    return { success: true, data: { isSaved } };
  }

  @Patch('me/saved-items/:id/notes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notes on a saved item' })
  @ApiParam({ name: 'id', description: 'Saved item ID' })
  @ApiResponse({ status: 200, description: 'Notes updated' })
  async updateSavedItemNotes(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSavedItemNotesDto,
  ) {
    const item = await this.savedItemsService.updateNotes(req.user.id, id, dto.notes);
    return {
      success: true,
      data: item,
      message: 'Notes updated successfully',
    };
  }

  @Delete('me/saved-items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an item from wishlist' })
  @ApiParam({ name: 'id', description: 'Saved item ID' })
  @ApiResponse({ status: 200, description: 'Item removed from wishlist' })
  async removeSavedItem(@Request() req, @Param('id') id: string) {
    const result = await this.savedItemsService.removeItem(req.user.id, id);
    return { success: true, ...result };
  }

  // =====================================================
  // SAVED TRAVELERS
  // =====================================================

  @Post('me/travelers')
  @ApiOperation({ summary: 'Add a saved traveler' })
  @ApiResponse({ status: 201, description: 'Traveler saved' })
  @ApiResponse({ status: 400, description: 'Max travelers limit reached' })
  async addTraveler(@Request() req, @Body() dto: CreateSavedTravelerDto) {
    const traveler = await this.savedTravelersService.addTraveler(req.user.id, dto);
    return {
      success: true,
      data: traveler,
      message: 'Traveler saved successfully',
    };
  }

  @Get('me/travelers')
  @ApiOperation({ summary: 'List saved travelers' })
  @ApiResponse({ status: 200, description: 'Travelers retrieved' })
  async listTravelers(@Request() req) {
    const result = await this.savedTravelersService.listTravelers(req.user.id);
    return {
      success: true,
      ...result,
      message: 'Travelers retrieved successfully',
    };
  }

  @Get('me/travelers/:id')
  @ApiOperation({ summary: 'Get a specific saved traveler' })
  @ApiParam({ name: 'id', description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler retrieved' })
  async getTraveler(@Request() req, @Param('id') id: string) {
    const traveler = await this.savedTravelersService.getTraveler(req.user.id, id);
    return {
      success: true,
      data: traveler,
      message: 'Traveler retrieved successfully',
    };
  }

  @Put('me/travelers/:id')
  @ApiOperation({ summary: 'Update a saved traveler' })
  @ApiParam({ name: 'id', description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler updated' })
  async updateTraveler(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSavedTravelerDto,
  ) {
    const traveler = await this.savedTravelersService.updateTraveler(req.user.id, id, dto);
    return {
      success: true,
      data: traveler,
      message: 'Traveler updated successfully',
    };
  }

  @Delete('me/travelers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a saved traveler' })
  @ApiParam({ name: 'id', description: 'Traveler ID' })
  @ApiResponse({ status: 200, description: 'Traveler removed' })
  async removeTraveler(@Request() req, @Param('id') id: string) {
    const result = await this.savedTravelersService.removeTraveler(req.user.id, id);
    return { success: true, ...result };
  }

  @Post('me/travelers/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch travelers by IDs for checkout',
    description: 'Returns full traveler details (including unmasked passport) for use during booking',
  })
  @ApiResponse({ status: 200, description: 'Travelers retrieved for checkout' })
  async getTravelersForCheckout(@Request() req, @Body() dto: GetTravelersByIdsDto) {
    const travelers = await this.savedTravelersService.getTravelersByIds(
      req.user.id,
      dto.travelerIds,
    );
    return {
      success: true,
      data: travelers,
      message: 'Travelers retrieved for checkout',
    };
  }

  // =====================================================
  // FULL PROFILE DASHBOARD (aggregate endpoint)
  // =====================================================

  @Get('me/dashboard')
  @ApiOperation({
    summary: 'Get full user profile dashboard',
    description: 'Returns profile, loyalty summary, saved items count, travelers count, and payment methods count in a single call',
  })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getProfileDashboard(@Request() req) {
    const userId = req.user.id;

    const [profile, loyalty, savedItemsCounts, travelers, paymentMethods] = await Promise.all([
      this.userService.getProfile(userId),
      this.loyaltyService.getLoyaltySummary(userId),
      this.savedItemsService.getSavedItemsCounts(userId),
      this.savedTravelersService.listTravelers(userId),
      this.savedPaymentMethodService.listPaymentMethods(userId),
    ]);

    return {
      success: true,
      data: {
        profile,
        loyalty: loyalty.account,
        nextTier: loyalty.nextTier,
        savedItems: savedItemsCounts,
        travelers: {
          count: travelers.data.length,
          maxAllowed: travelers.meta.maxAllowed,
        },
        paymentMethods: {
          count: paymentMethods.length,
          hasDefault: paymentMethods.some((m) => m.isDefault),
        },
      },
      message: 'Dashboard retrieved successfully',
    };
  }
}

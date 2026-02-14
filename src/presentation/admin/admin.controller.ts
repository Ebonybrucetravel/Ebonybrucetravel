import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RewardsAdminService } from '@domains/loyalty/rewards-admin.service';
import { LoyaltyService } from '@domains/loyalty/loyalty.service';
import {
  ProcessCancellationRequestUseCase,
  ProcessCancellationRequestAction,
  ProcessCancellationRequestDto,
} from '@application/booking/use-cases/process-cancellation-request.use-case';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardsAdminService: RewardsAdminService,
    private readonly loyaltyService: LoyaltyService,
    private readonly processCancellationRequestUseCase: ProcessCancellationRequestUseCase,
  ) {}

  @Post('users')
  @ApiOperation({ summary: 'Create a new admin user (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  async createAdmin(@Body() createAdminDto: CreateAdminDto, @Request() req) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createAdminDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Validate role
    if (createAdminDto.role !== UserRole.ADMIN && createAdminDto.role !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Role must be ADMIN or SUPER_ADMIN');
    }

    // Only SUPER_ADMIN can create SUPER_ADMIN
    if (createAdminDto.role === UserRole.SUPER_ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Only Super Admin can create Super Admin users');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    // Create admin user
    const admin = await this.prisma.user.create({
      data: {
        email: createAdminDto.email,
        name: createAdminDto.name,
        password: hashedPassword,
        role: createAdminDto.role,
        phone: createAdminDto.phone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log admin creation in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_ADMIN_USER',
        entityType: 'User',
        entityId: admin.id,
        changes: {
          email: admin.email,
          role: admin.role,
          createdBy: req.user.email,
        },
      },
    });

    return {
      success: true,
      message: 'Admin user created successfully',
      data: admin,
    };
  }

  @Get('users')
  @ApiOperation({
    summary: 'List all admin users (Super Admin only)',
    description: 'Returns a list of all admin users (ADMIN and SUPER_ADMIN roles).',
  })
  @ApiResponse({ status: 200, description: 'Admin users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  @ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'SUPER_ADMIN'], description: 'Filter by role' })
  async listAdmins(@Query('role') role?: string) {
    const where: any = {
      role: {
        in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      deletedAt: null,
    };

    if (role && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
      where.role = role;
    }

    const admins = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: admins,
      message: 'Admin users retrieved successfully',
    };
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get admin user by ID (Super Admin only)',
    description: 'Returns details of a specific admin user including permissions.',
  })
  @ApiResponse({ status: 200, description: 'Admin user retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Admin user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  async getAdmin(@Param('id') id: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    return {
      success: true,
      data: admin,
      message: 'Admin user retrieved successfully',
    };
  }

  @Put('users/:id')
  @ApiOperation({
    summary: 'Update admin user (Super Admin only)',
    description: 'Updates admin user details. Can update name, phone, role, and permissions.',
  })
  @ApiResponse({ status: 200, description: 'Admin user updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  async updateAdmin(@Param('id') id: string, @Body() updateDto: UpdateAdminDto, @Request() req) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
        deletedAt: null,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    // Prevent downgrading SUPER_ADMIN unless current user is SUPER_ADMIN
    if (admin.role === UserRole.SUPER_ADMIN && updateDto.role === UserRole.ADMIN) {
      if (req.user.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only Super Admin can downgrade Super Admin users');
      }
    }

    // Prevent promoting to SUPER_ADMIN unless current user is SUPER_ADMIN
    if (updateDto.role === UserRole.SUPER_ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can create or promote to Super Admin');
    }

    const updateData: any = {};
    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.phone !== undefined) updateData.phone = updateDto.phone;
    if (updateDto.role !== undefined) updateData.role = updateDto.role;
    if (updateDto.permissions !== undefined) {
      // Store permissions as JSON in a metadata field (we'll add this to schema if needed, or use existing field)
      // For now, we can store in a JSON field if available, or we'll need to add it to schema
      // Since we don't have a permissions field, we'll skip this for now and add it via migration later
      // For MVP, we can use role-based access only
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log update in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_ADMIN_USER',
        entityType: 'User',
        entityId: id,
        changes: {
          updatedFields: Object.keys(updateData),
          updatedBy: req.user.email,
        },
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Admin user updated successfully',
    };
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Delete admin user (Super Admin only)',
    description: 'Soft deletes an admin user. The user cannot log in after deletion.',
  })
  @ApiResponse({ status: 200, description: 'Admin user deleted successfully' })
  @ApiResponse({ status: 404, description: 'Admin user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  async deleteAdmin(@Param('id') id: string, @Request() req) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
        deletedAt: null,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    // Prevent deleting yourself
    if (admin.id === req.user.id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Prevent deleting SUPER_ADMIN unless current user is SUPER_ADMIN
    if (admin.role === UserRole.SUPER_ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can delete Super Admin users');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${admin.email}`, // Anonymize email
      },
    });

    // Log deletion in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_ADMIN_USER',
        entityType: 'User',
        entityId: id,
        changes: {
          deletedEmail: admin.email,
          deletedBy: req.user.email,
        },
      },
    });

    return {
      success: true,
      message: 'Admin user deleted successfully',
    };
  }

  @Post('users/:id/permissions')
  @ApiOperation({
    summary: 'Assign permissions to admin user (Super Admin only)',
    description:
      'Assigns specific permissions to a regular admin user. SUPER_ADMIN users have all permissions by default and cannot have permissions modified.',
  })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  @ApiResponse({ status: 404, description: 'Admin user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignDto: AssignPermissionsDto,
    @Request() req,
  ) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
        deletedAt: null,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    // SUPER_ADMIN has all permissions by default
    if (admin.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Super Admin users have all permissions by default');
    }

    // For now, we'll store permissions in a note or we can add a permissions JSON field
    // Since we don't have a permissions field in the schema, we'll log this action
    // and implement permission checking in guards/decorators later
    // For MVP, role-based access is sufficient

    // Log permission assignment in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ASSIGN_PERMISSIONS',
        entityType: 'User',
        entityId: id,
        changes: {
          permissions: assignDto.permissions,
          assignedBy: req.user.email,
        },
      },
    });

    return {
      success: true,
      message: 'Permissions assigned successfully. Note: Full permission system implementation pending schema update.',
      data: {
        userId: id,
        permissions: assignDto.permissions,
      },
    };
  }

  @Get('bookings')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List all bookings (Admin only)',
    description:
      'Returns all bookings across all users. Supports filtering by status, product type, provider, and date range.',
  })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by booking status' })
  @ApiQuery({ name: 'productType', required: false, description: 'Filter by product type' })
  @ApiQuery({ name: 'provider', required: false, description: 'Filter by provider' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default: 50, max: 100)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  async listAllBookings(@Query() query: any) {
    const {
      status,
      productType,
      provider,
      userId,
      startDate,
      endDate,
      limit = 50,
      page = 1,
    } = query;

    const where: any = {
      deletedAt: null,
    };

    if (status) where.status = status;
    if (productType) where.productType = productType;
    if (provider) where.provider = provider;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Math.min(Number(limit), 100);

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      success: true,
      data: bookings,
      meta: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
      message: 'Bookings retrieved successfully',
    };
  }

  @Get('audit-logs')
  @ApiOperation({
    summary: 'Get audit logs (Super Admin only)',
    description: 'Returns audit logs of admin actions for security and compliance.',
  })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID who performed action' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default: 50, max: 100)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  async getAuditLogs(@Query() query: any) {
    const { userId, action, limit = 50, page = 1 } = query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Math.min(Number(limit), 100);

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      data: logs,
      meta: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
      message: 'Audit logs retrieved successfully',
    };
  }

  // =====================================================
  // REWARDS & LOYALTY MANAGEMENT (Admin)
  // =====================================================

  @Get('rewards/dashboard')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get rewards system dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  async getRewardsDashboard() {
    const stats = await this.rewardsAdminService.getRewardsDashboardStats();
    return { success: true, data: stats, message: 'Rewards dashboard retrieved' };
  }

  // --- Reward Rules (Points → Voucher conversion) ---

  @Post('rewards/rules')
  @ApiOperation({
    summary: 'Create a reward rule (points → voucher conversion)',
    description: 'Define how many points users need to redeem for a discount voucher',
  })
  @ApiResponse({ status: 201, description: 'Reward rule created' })
  async createRewardRule(@Body() body: any) {
    const rule = await this.rewardsAdminService.createRewardRule(body);
    return { success: true, data: rule, message: 'Reward rule created successfully' };
  }

  @Get('rewards/rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all reward rules' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Reward rules retrieved' })
  async listRewardRules(@Query('activeOnly') activeOnly?: boolean) {
    const rules = await this.rewardsAdminService.listRewardRules({ activeOnly });
    return { success: true, data: rules, message: 'Reward rules retrieved' };
  }

  @Get('rewards/rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get a specific reward rule' })
  @ApiParam({ name: 'id', description: 'Reward rule ID' })
  @ApiResponse({ status: 200, description: 'Reward rule retrieved' })
  async getRewardRule(@Param('id') id: string) {
    const rule = await this.rewardsAdminService.getRewardRule(id);
    return { success: true, data: rule, message: 'Reward rule retrieved' };
  }

  @Put('rewards/rules/:id')
  @ApiOperation({ summary: 'Update a reward rule' })
  @ApiParam({ name: 'id', description: 'Reward rule ID' })
  @ApiResponse({ status: 200, description: 'Reward rule updated' })
  async updateRewardRule(@Param('id') id: string, @Body() body: any) {
    const rule = await this.rewardsAdminService.updateRewardRule(id, body);
    return { success: true, data: rule, message: 'Reward rule updated successfully' };
  }

  @Delete('rewards/rules/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a reward rule' })
  @ApiParam({ name: 'id', description: 'Reward rule ID' })
  @ApiResponse({ status: 200, description: 'Reward rule deactivated' })
  async deleteRewardRule(@Param('id') id: string) {
    const result = await this.rewardsAdminService.deleteRewardRule(id);
    return { success: true, ...result };
  }

  // --- Tier Configuration ---

  @Get('rewards/tiers')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all loyalty tier configurations' })
  @ApiResponse({ status: 200, description: 'Tier configs retrieved' })
  async getTierConfigs() {
    const tiers = await this.rewardsAdminService.getAllTierConfigs();
    return { success: true, data: tiers, message: 'Tier configurations retrieved' };
  }

  @Put('rewards/tiers')
  @ApiOperation({
    summary: 'Upsert a loyalty tier configuration',
    description: 'Create or update tier thresholds, multipliers, and benefits',
  })
  @ApiResponse({ status: 200, description: 'Tier config upserted' })
  async upsertTierConfig(@Body() body: any) {
    const config = await this.rewardsAdminService.upsertTierConfig(body);
    return { success: true, data: config, message: 'Tier configuration updated' };
  }

  @Post('rewards/tiers/seed-defaults')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default tier configurations (only if none exist)' })
  @ApiResponse({ status: 200, description: 'Default tiers seeded' })
  async seedDefaultTiers() {
    await this.rewardsAdminService.seedDefaultTierConfigs();
    const tiers = await this.rewardsAdminService.getAllTierConfigs();
    return { success: true, data: tiers, message: 'Default tier configurations seeded' };
  }

  // --- Points Earning Rules ---

  @Get('rewards/earning-rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all points earning rules per product type' })
  @ApiResponse({ status: 200, description: 'Earning rules retrieved' })
  async getEarningRules() {
    const rules = await this.rewardsAdminService.getAllPointsEarningRules();
    return { success: true, data: rules, message: 'Earning rules retrieved' };
  }

  @Put('rewards/earning-rules')
  @ApiOperation({
    summary: 'Upsert a points earning rule',
    description: 'Configure how many points users earn per currency unit spent on each product type',
  })
  @ApiResponse({ status: 200, description: 'Earning rule upserted' })
  async upsertEarningRule(@Body() body: any) {
    const rule = await this.rewardsAdminService.upsertPointsEarningRule(body);
    return { success: true, data: rule, message: 'Earning rule updated' };
  }

  @Post('rewards/earning-rules/seed-defaults')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default earning rules (only if none exist)' })
  @ApiResponse({ status: 200, description: 'Default earning rules seeded' })
  async seedDefaultEarningRules() {
    await this.rewardsAdminService.seedDefaultEarningRules();
    const rules = await this.rewardsAdminService.getAllPointsEarningRules();
    return { success: true, data: rules, message: 'Default earning rules seeded' };
  }

  // --- Voucher Management ---

  @Get('rewards/vouchers')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all vouchers (admin view)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Vouchers retrieved' })
  async listVouchers(@Query() query: any) {
    const result = await this.rewardsAdminService.listVouchers(query);
    return { success: true, ...result, message: 'Vouchers retrieved' };
  }

  @Delete('rewards/vouchers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a voucher' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher cancelled' })
  async cancelVoucher(@Param('id') id: string) {
    const result = await this.rewardsAdminService.cancelVoucher(id);
    return { success: true, ...result };
  }

  // --- User Loyalty Management ---

  @Post('rewards/users/:userId/adjust-points')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually adjust user loyalty points (credit or debit)',
    description: 'Positive points = credit, negative points = debit',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Points adjusted' })
  async adjustUserPoints(
    @Param('userId') userId: string,
    @Body() body: { points: number; reason: string },
    @Request() req,
  ) {
    const result = await this.loyaltyService.adminAdjustPoints(
      userId,
      body.points,
      body.reason,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      message: `Points adjusted by ${body.points > 0 ? '+' : ''}${body.points}`,
    };
  }

  @Get('rewards/users/:userId/loyalty')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'View a user\'s loyalty details' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User loyalty details retrieved' })
  async getUserLoyalty(@Param('userId') userId: string) {
    const summary = await this.loyaltyService.getLoyaltySummary(userId);
    return { success: true, data: summary, message: 'User loyalty details retrieved' };
  }

  // --- Cancellation queue (after-deadline hotel cancellations, BOOKING_OPERATIONS_AND_RISK) ---

  @Get('cancellation-requests')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List pending cancellation requests (after-deadline hotel)',
    description: 'Shows booking details, cancellation policy snapshot, deadline, and refundability for admin review.',
  })
  @ApiResponse({ status: 200, description: 'List of pending cancellation requests' })
  async listCancellationRequests() {
    const list = await this.processCancellationRequestUseCase.listPending();
    return { success: true, data: list };
  }

  @Post('cancellation-requests/:id/process')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Process a cancellation request',
    description: 'Reject, partial refund (goodwill), or full refund (exception). Cancels in Amadeus and refunds via Stripe when approving.',
  })
  @ApiParam({ name: 'id', description: 'Cancellation request ID' })
  @ApiResponse({ status: 200, description: 'Request processed' })
  async processCancellationRequest(
    @Param('id') id: string,
    @Body() body: { action: ProcessCancellationRequestAction; refundAmount?: number; adminNotes?: string; rejectionReason?: string },
    @Request() req: any,
  ) {
    const dto: ProcessCancellationRequestDto = {
      action: body.action,
      refundAmount: body.refundAmount,
      adminNotes: body.adminNotes,
      rejectionReason: body.rejectionReason,
    };
    const result = await this.processCancellationRequestUseCase.execute(id, req.user.id, dto);
    return { success: true, data: result };
  }

  @Get('bookings/:bookingId/dispute-evidence')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Get dispute/chargeback evidence pack for a booking',
    description:
      'Returns Stripe charge ID, policy snapshot, deadline, IP, user agent, TOS acceptance, confirmation email log, refund/cancel logs, and Amadeus confirmation for submitting to Stripe.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Evidence pack for dispute response' })
  async getDisputeEvidence(@Param('bookingId') bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const bookingData = (booking.bookingData as any) || {};
    const b = booking as any;
    const evidence = {
      bookingId: booking.id,
      reference: booking.reference,
      stripeChargeId: b.stripeChargeId,
      paymentIntentId: booking.paymentReference,
      amount: Number(booking.totalAmount),
      currency: booking.currency,
      guestEmail: booking.user?.email,
      guestName: booking.user?.name,
      cancellationDeadline: b.cancellationDeadline,
      cancellationPolicySnapshot: b.cancellationPolicySnapshot,
      bookingTimestampUtc: booking.createdAt,
      clientIp: b.clientIp,
      userAgent: b.userAgent,
      policyAcceptedAt: b.policyAcceptedAt,
      confirmationEmailSentAt: b.confirmationEmailSentAt,
      cancelledAt: booking.cancelledAt,
      refundAmount: booking.refundAmount ? Number(booking.refundAmount) : null,
      refundStatus: booking.refundStatus,
      cancellationLog: bookingData.cancellation ?? null,
      amadeusConfirmation: booking.providerData ?? null,
    };
    return { success: true, data: evidence };
  }
}

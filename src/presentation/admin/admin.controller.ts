import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from './dto/create-admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

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
    if (
      createAdminDto.role !== UserRole.ADMIN &&
      createAdminDto.role !== UserRole.SUPER_ADMIN
    ) {
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
      message: 'Admin user created successfully',
      user: admin,
    };
  }
}



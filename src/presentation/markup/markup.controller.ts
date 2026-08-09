
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { Prisma, ProductType } from '@prisma/client';

@ApiTags('Markups')
@ApiBearerAuth()
@Controller('markups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class MarkupController {
  constructor(
    private readonly markupRepository: MarkupRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all markup configurations (Admin only)' })
  @ApiQuery({ name: 'productType', required: false, enum: ProductType })
  @ApiQuery({ name: 'currency', required: false })
  async findAll(@Query('productType') productType?: string, @Query('currency') currency?: string) {
    const configs = await this.markupRepository.findAll({
      ...(productType && { productType: productType as ProductType }),
      ...(currency && { currency }),
    });
    return {
      success: true,
      data: configs,
      message: 'Markup configurations retrieved successfully',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create markup configuration (Admin only)' })
  async create(
    @Body()
    body: {
      productType: ProductType;
      markupPercentage: number;
      serviceFeePercentage: number;  
      taxPercentage?: number;       
      currency?: string;
      description?: string;
    },
    @Request() req: any,
  ) {
    if (
      body.markupPercentage == null ||
      body.markupPercentage < 0 ||
      body.serviceFeePercentage == null ||  // ✅ Changed
      body.serviceFeePercentage < 0         // ✅ Changed
    ) {
      throw new BadRequestException(
        'markupPercentage and serviceFeePercentage must be non-negative numbers',  // ✅ Updated
      );
    }
    
    const currency = body.currency ?? 'GBP';
    const taxPercentage = body.taxPercentage ?? 15; // Default tax percentage
    
    const created = await this.markupRepository.create({
      productType: body.productType,
      markupPercentage: body.markupPercentage,
      serviceFeePercentage: body.serviceFeePercentage,  // ✅ Changed from serviceFeeAmount
      taxPercentage: taxPercentage,                    // ✅ Added
      currency,
      description: body.description,
      createdBy: req.user?.id,
    });
    
    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_MARKUP_CONFIG',
        entityType: 'MarkupConfig',
        entityId: created.id,
        changes: {
          productType: created.productType,
          markupPercentage: created.markupPercentage,
          serviceFeePercentage: created.serviceFeePercentage,  // ✅ Changed
          taxPercentage: created.taxPercentage,                // ✅ Added
          currency: created.currency,
        },
      },
    });
    
    return {
      success: true,
      data: created,
      message: 'Markup configuration created successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update markup configuration (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      markupPercentage?: number;
      serviceFeePercentage?: number;  // ✅ Changed from serviceFeeAmount
      taxPercentage?: number;        // ✅ Added
      description?: string;
      isActive?: boolean;
    },
    @Request() req: any,
  ) {
    const existing = await this.markupRepository.findById(id);
    if (!existing) throw new NotFoundException('Markup configuration not found');
    
    if (
      (body.markupPercentage != null && body.markupPercentage < 0) ||
      (body.serviceFeePercentage != null && body.serviceFeePercentage < 0)  // ✅ Changed
    ) {
      throw new BadRequestException('markupPercentage and serviceFeePercentage must be non-negative');  // ✅ Updated
    }
    
    const updated = await this.markupRepository.update(id, {
      markupPercentage: body.markupPercentage,
      serviceFeePercentage: body.serviceFeePercentage,  // ✅ Changed
      taxPercentage: body.taxPercentage,                // ✅ Added
      description: body.description,
      isActive: body.isActive,
    });
    
    if (!updated) throw new NotFoundException('Markup configuration not found');
    
    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_MARKUP_CONFIG',
        entityType: 'MarkupConfig',
        entityId: id,
        changes: JSON.parse(
          JSON.stringify({ before: existing, after: updated }),
        ) as Prisma.InputJsonValue,
      },
    });
    
    return {
      success: true,
      data: updated,
      message: 'Markup configuration updated successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate markup configuration (Admin only)' })
  async delete(@Param('id') id: string, @Request() req: any) {
    const existing = await this.markupRepository.findById(id);
    if (!existing) throw new NotFoundException('Markup configuration not found');
    const updated = await this.markupRepository.deactivate(id);
    if (!updated) throw new NotFoundException('Markup configuration not found');
    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DEACTIVATE_MARKUP_CONFIG',
        entityType: 'MarkupConfig',
        entityId: id,
        changes: { productType: existing.productType, currency: existing.currency },
      },
    });
    return {
      success: true,
      data: updated,
      message: 'Markup configuration deactivated successfully',
    };
  }
}
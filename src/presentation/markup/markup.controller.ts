import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('Markups')
@ApiBearerAuth()
@Controller('markups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class MarkupController {
  @Get()
  @ApiOperation({ summary: 'Get all markup configurations (Admin only)' })
  async findAll() {
    // TODO: Implement get all markups
    return [];
  }

  @Post()
  @ApiOperation({ summary: 'Create markup configuration (Admin only)' })
  async create(@Body() body: any) {
    // TODO: Implement create markup
    return {};
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update markup configuration (Admin only)' })
  async update(@Param('id') id: string, @Body() body: any) {
    // TODO: Implement update markup
    return {};
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate markup configuration (Admin only)' })
  async delete(@Param('id') id: string) {
    // TODO: Implement deactivate markup
    return {};
  }
}


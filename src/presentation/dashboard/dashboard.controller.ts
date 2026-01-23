import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class DashboardController {
  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics (Admin only)' })
  async getStats() {
    // TODO: Implement dashboard statistics
    return {
      totalBookings: 0,
      totalRevenue: 0,
      bookingsByStatus: {},
      bookingsByProductType: {},
    };
  }
}

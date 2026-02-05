import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard statistics (Admin only)',
    description:
      'Returns comprehensive dashboard statistics including total bookings, revenue, bookings by status, product type, and recent activity.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for statistics (ISO string). Defaults to 30 days ago.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for statistics (ISO string). Defaults to today.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Total bookings
    const totalBookings = await this.prisma.booking.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Total revenue (sum of totalAmount for completed bookings)
    const revenueResult = await this.prisma.booking.aggregate({
      where: {
        deletedAt: null,
        paymentStatus: 'COMPLETED',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = revenueResult._sum.totalAmount || 0;

    // Bookings by status
    const bookingsByStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    // Bookings by product type
    const bookingsByProductType = await this.prisma.booking.groupBy({
      by: ['productType'],
      where: {
        deletedAt: null,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Bookings by provider
    const bookingsByProvider = await this.prisma.booking.groupBy({
      by: ['provider'],
      where: {
        deletedAt: null,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    // Recent bookings (last 10)
    const recentBookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
      },
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
      take: 10,
    });

    // Payment status breakdown
    const paymentStatusBreakdown = await this.prisma.booking.groupBy({
      by: ['paymentStatus'],
      where: {
        deletedAt: null,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    return {
      success: true,
      data: {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        totalBookings,
        totalRevenue: Number(totalRevenue),
        bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        bookingsByProductType: bookingsByProductType.reduce((acc, item) => {
          acc[item.productType] = {
            count: item._count.id,
            revenue: Number(item._sum.totalAmount || 0),
          };
          return acc;
        }, {} as Record<string, { count: number; revenue: number }>),
        bookingsByProvider: bookingsByProvider.reduce((acc, item) => {
          acc[item.provider] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        paymentStatusBreakdown: paymentStatusBreakdown.reduce((acc, item) => {
          acc[item.paymentStatus] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        recentBookings: recentBookings.map((booking) => ({
          id: booking.id,
          reference: booking.reference,
          productType: booking.productType,
          status: booking.status,
          totalAmount: Number(booking.totalAmount),
          currency: booking.currency,
          user: booking.user,
          createdAt: booking.createdAt,
        })),
      },
      message: 'Dashboard statistics retrieved successfully',
    };
  }
}

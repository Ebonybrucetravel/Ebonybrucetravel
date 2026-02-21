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
      'Returns comprehensive dashboard statistics including total bookings, revenue, active users, period comparison, and recent activity.',
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
  @ApiQuery({
    name: 'productType',
    required: false,
    description: 'Filter all aggregates by product type (e.g. FLIGHT_DOMESTIC, HOTEL, CAR_RENTAL).',
  })
  @ApiQuery({
    name: 'compareWithPrevious',
    required: false,
    description:
      'If "true", returns previousPeriod and percentChange for totalBookings and totalRevenue.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productType') productType?: string,
    @Query('compareWithPrevious') compareWithPrevious?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const productFilter =
      productType && productType.trim() ? { productType: productType.trim() } : {};
    const dateRange = { gte: start, lte: end };
    const baseWhere = {
      deletedAt: null,
      createdAt: dateRange,
      ...productFilter,
    };

    // Total bookings
    const totalBookings = await this.prisma.booking.count({ where: baseWhere });

    // Total revenue (completed payments only)
    const revenueResult = await this.prisma.booking.aggregate({
      where: { ...baseWhere, paymentStatus: 'COMPLETED' },
      _sum: { totalAmount: true },
    });
    const totalRevenue = Number(revenueResult._sum.totalAmount || 0);

    // Active users (customers who had at least one booking in period, or all CUSTOMERs created in period)
    const activeUsersInPeriod = await this.prisma.user.count({
      where: {
        role: 'CUSTOMER',
        deletedAt: null,
        suspendedAt: null,
        OR: [
          { createdAt: dateRange },
          { bookings: { some: { deletedAt: null, createdAt: dateRange } } },
        ],
      },
    });

    // Previous period (same length) for % change
    let previousPeriod: { totalBookings: number; totalRevenue: number } | null = null;
    let percentChange: { totalBookings: number | null; totalRevenue: number | null } = {
      totalBookings: null,
      totalRevenue: null,
    };
    if (compareWithPrevious === 'true' || compareWithPrevious === '1') {
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const prevWhere = {
        deletedAt: null,
        createdAt: { gte: prevStart, lte: prevEnd },
        ...productFilter,
      };
      const [prevBookings, prevRevenueResult] = await Promise.all([
        this.prisma.booking.count({ where: prevWhere }),
        this.prisma.booking.aggregate({
          where: { ...prevWhere, paymentStatus: 'COMPLETED' },
          _sum: { totalAmount: true },
        }),
      ]);
      const prevRevenue = Number(prevRevenueResult._sum.totalAmount || 0);
      previousPeriod = { totalBookings: prevBookings, totalRevenue: prevRevenue };
      percentChange = {
        totalBookings:
          prevBookings === 0
            ? totalBookings > 0
              ? 100
              : 0
            : Math.round(((totalBookings - prevBookings) / prevBookings) * 10000) / 100,
        totalRevenue:
          prevRevenue === 0
            ? totalRevenue > 0
              ? 100
              : 0
            : Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 10000) / 100,
      };
    }

    // Bookings by status
    const bookingsByStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    });

    // Bookings by product type
    const bookingsByProductType = await this.prisma.booking.groupBy({
      by: ['productType'],
      where: baseWhere,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    // Bookings by provider
    const bookingsByProvider = await this.prisma.booking.groupBy({
      by: ['provider'],
      where: baseWhere,
      _count: { id: true },
    });

    // Recent bookings (last 10 **in period**)
    const recentBookings = await this.prisma.booking.findMany({
      where: { deletedAt: null, createdAt: dateRange, ...productFilter },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Payment status breakdown
    const paymentStatusBreakdown = await this.prisma.booking.groupBy({
      by: ['paymentStatus'],
      where: baseWhere,
      _count: { id: true },
    });

    return {
      success: true,
      data: {
        period: { start: start.toISOString(), end: end.toISOString() },
        totalBookings,
        totalRevenue,
        activeUsers: activeUsersInPeriod,
        ...(previousPeriod && { previousPeriod }),
        ...(previousPeriod && { percentChange }),
        bookingsByStatus: bookingsByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
        bookingsByProductType: bookingsByProductType.reduce(
          (acc, item) => {
            acc[item.productType] = {
              count: item._count.id,
              revenue: Number(item._sum.totalAmount || 0),
            };
            return acc;
          },
          {} as Record<string, { count: number; revenue: number }>,
        ),
        bookingsByProvider: bookingsByProvider.reduce(
          (acc, item) => {
            acc[item.provider] = item._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
        paymentStatusBreakdown: paymentStatusBreakdown.reduce(
          (acc, item) => {
            acc[item.paymentStatus] = item._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
        recentBookings: recentBookings.map((b) => ({
          id: b.id,
          reference: b.reference,
          productType: b.productType,
          status: b.status,
          totalAmount: Number(b.totalAmount),
          currency: b.currency,
          user: b.user,
          createdAt: b.createdAt,
        })),
      },
      message: 'Dashboard statistics retrieved successfully',
    };
  }
}

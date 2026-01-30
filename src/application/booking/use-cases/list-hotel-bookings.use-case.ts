import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class ListHotelBookingsUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId?: string, pagination?: { limit?: number; cursor?: string }) {
    try {
      // Get bookings from our database
      const where: any = {
        productType: 'HOTEL',
        deletedAt: null,
      };

      if (userId) {
        where.userId = userId;
      }

      const limit = pagination?.limit || 20;
      const bookings = await this.prisma.booking.findMany({
        where,
        take: limit + 1, // Fetch one extra to check if there are more
        ...(pagination?.cursor && {
          cursor: { id: pagination.cursor },
          skip: 1,
        }),
        orderBy: { createdAt: 'desc' },
      });

      const hasMore = bookings.length > limit;
      const results = hasMore ? bookings.slice(0, limit) : bookings;
      const nextCursor = hasMore ? results[results.length - 1].id : null;

      return {
        data: results,
        meta: {
          count: results.length,
          limit,
          hasMore,
          nextCursor,
        },
      };
    } catch (error) {
      console.error('Error listing hotel bookings:', error);
      throw error;
    }
  }
}


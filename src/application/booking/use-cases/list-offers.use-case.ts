import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { CacheService } from '@infrastructure/cache/cache.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { ProductType } from '@prisma/client';
import { PaginationQueryDto, PaginatedResponseDto, PaginationMetaDto } from '@presentation/booking/dto/pagination.dto';

@Injectable()
export class ListOffersUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly cacheService: CacheService,
    private readonly markupRepository: MarkupRepository,
  ) {}

  async execute(
    offerRequestId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const { limit = 20, cursor, sort = 'total_amount', sortOrder = 'asc' } = pagination;

    // Check cache first
    const cacheKey = `offers:${offerRequestId}:${limit}:${cursor || 'first'}:${sort}:${sortOrder}`;
    const cached = this.cacheService.get<PaginatedResponseDto<any>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Fetch from Duffel API
    const response = await this.duffelService.listOffers(offerRequestId, {
      limit: Math.min(limit, 200), // Duffel max is 200
      after: cursor || undefined,
      sort: sort === 'total_amount' ? 'total_amount' : sort,
    });

    // Apply markup to offers
    const offersWithMarkup = await Promise.all(
      response.data.map(async (offer) => {
        const basePrice = parseFloat(offer.total_amount);
        const currency = offer.total_currency;

        // Get markup configuration
        let markupPercentage = 0;
        try {
          const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
            ProductType.FLIGHT_INTERNATIONAL,
            currency,
          );
          markupPercentage = markupConfig?.markupPercentage || 0;
        } catch (error) {
          console.warn('Could not fetch markup config, using 0%:', error);
        }

        const markupAmount = (basePrice * markupPercentage) / 100;
        const finalPrice = basePrice + markupAmount;

        return {
          ...offer,
          original_amount: offer.total_amount,
          markup_percentage: markupPercentage,
          markup_amount: markupAmount.toFixed(2),
          final_amount: finalPrice.toFixed(2),
          currency: offer.total_currency,
        };
      }),
    );

    // Sort offers if needed (Duffel may not support all sort options)
    if (sort === 'total_amount') {
      offersWithMarkup.sort((a, b) => {
        const priceA = parseFloat(a.final_amount);
        const priceB = parseFloat(b.final_amount);
        return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      });
    }

    // Calculate pagination metadata
    const hasMore = response.meta.after !== null;
    const currentPage = cursor ? this.extractPageFromCursor(cursor) : 1;
    const totalPages = hasMore ? currentPage + 1 : currentPage; // Approximate

    const meta: PaginationMetaDto = {
      count: offersWithMarkup.length,
      total: offersWithMarkup.length, // Duffel doesn't provide total, so we use count
      limit,
      nextCursor: response.meta.after,
      prevCursor: response.meta.before,
      hasMore,
      page: currentPage,
      totalPages,
    };

    const result: PaginatedResponseDto<any> = {
      data: offersWithMarkup,
      meta,
    };

    // Cache for 2 minutes (offers expire quickly)
    this.cacheService.set(cacheKey, result, 2 * 60 * 1000);

    return result;
  }

  /**
   * Extract page number from cursor (approximate)
   */
  private extractPageFromCursor(cursor: string): number {
    // Cursor is base64 encoded, we can't reliably extract page number
    // This is an approximation - in production, you might want to track pages differently
    return 2; // Assume page 2+ if cursor exists
  }
}


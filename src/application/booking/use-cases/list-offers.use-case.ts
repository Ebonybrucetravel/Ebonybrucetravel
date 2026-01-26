import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { CacheService } from '@infrastructure/cache/cache.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { ProductType } from '@prisma/client';
import {
  PaginationQueryDto,
  PaginatedResponseDto,
  PaginationMetaDto,
} from '@presentation/booking/dto/pagination.dto';

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
    try {
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

      // Validate response
      if (!response || !response.data) {
        throw new HttpException(
          'Invalid response from Duffel API: missing data',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Ensure data is an array
      const offers = Array.isArray(response.data) ? response.data : [];

      // Determine if route is domestic (Nigeria) from first offer's slice data
      // This allows us to use the correct markup (FLIGHT_DOMESTIC vs FLIGHT_INTERNATIONAL)
      const isDomestic = this.isNigerianRouteFromOffers(offers);

      // Apply markup to offers
      const offersWithMarkup = await Promise.all(
        offers.map(async (offer) => {
          const basePrice = parseFloat(offer.total_amount);
          const currency = offer.total_currency;

          // Get markup configuration - use FLIGHT_DOMESTIC for Nigerian routes, FLIGHT_INTERNATIONAL otherwise
          let markupPercentage = 0;
          try {
            const productType = isDomestic
              ? ProductType.FLIGHT_DOMESTIC
              : ProductType.FLIGHT_INTERNATIONAL;
            const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
              productType,
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
      const meta = response.meta || { limit: 50, after: null, before: null };
      const hasMore = meta.after !== null;
      const currentPage = cursor ? this.extractPageFromCursor(cursor) : 1;

      // Duffel's cursor-based pagination doesn't provide total count
      // We can only estimate: if hasMore, we know there are at least count + 1 offers
      // But we don't know the exact total without paginating through all pages
      // For cursor-based pagination, it's common to set total to null when unknown
      const estimatedTotal = hasMore
        ? null // Unknown - there are more offers but we don't know how many
        : offersWithMarkup.length; // This is the last page, so this is the exact total

      const totalPages = hasMore ? null : currentPage; // Can't calculate if total is unknown

      const paginationMeta: PaginationMetaDto = {
        count: offersWithMarkup.length,
        total: estimatedTotal, // null if unknown (hasMore), exact count if last page
        limit,
        nextCursor: meta.after,
        prevCursor: meta.before,
        hasMore,
        page: currentPage,
        totalPages: totalPages ?? null, // null if unknown
      };

      const result: PaginatedResponseDto<any> = {
        data: offersWithMarkup,
        meta: paginationMeta,
      };

      // Cache for 2 minutes (offers expire quickly)
      this.cacheService.set(cacheKey, result, 2 * 60 * 1000);

      return result;
    } catch (error) {
      // Log the error for debugging
      console.error('Error in ListOffersUseCase:', {
        offerRequestId,
        pagination,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw HttpException as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // Wrap other errors
      throw new HttpException(
        `Failed to list offers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extract page number from cursor (approximate)
   */
  private extractPageFromCursor(cursor: string): number {
    // Cursor is base64 encoded, we can't reliably extract page number
    // This is an approximation - in production, you might want to track pages differently
    return 2; // Assume page 2+ if cursor exists
  }

  /**
   * Determine if route is domestic (Nigeria) by checking offer slice data
   */
  private isNigerianRouteFromOffers(offers: any[]): boolean {
    if (!offers || offers.length === 0) {
      return false;
    }

    // Check first offer's first slice
    const firstSlice = offers[0]?.slices?.[0];
    if (!firstSlice) {
      return false;
    }

    const originCountry = firstSlice.origin?.iata_country_code;
    const destinationCountry = firstSlice.destination?.iata_country_code;

    // Route is domestic if both origin and destination are in Nigeria
    return originCountry === 'NG' && destinationCountry === 'NG';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { HotelbedsService } from './hotelbeds.service';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class HotelbedsContentService {
    private readonly logger = new Logger(HotelbedsContentService.name);

    constructor(
        private readonly hotelbedsService: HotelbedsService,
        private readonly cacheService: CacheService,
    ) { }

    /**
     * Make a paginated request to Hotelbeds Content API
     */
    private async fetchContent<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
        return this.hotelbedsService.makeRequest(endpoint, {
            method: 'GET',
            params,
            isContentApi: true,
        });
    }

    /**
     * Get hotel details, including images, facilities, and descriptions.
     * Caches results to avoid hammering the Content API.
     */
    async getHotelDetails(hotelCode: string, language: string = 'ENG'): Promise<any> {
        const cacheKey = `hotelbeds:content:hotel:${hotelCode}:${language}`;
        const cached = await this.cacheService.get<any>(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const response = await this.fetchContent<any>(`/hotels/${hotelCode}/details`, {
                language,
                useSecondaryLanguage: 'true',
            });

            const hotel = response.hotel;

            // Cache for 24 hours (content rarely changes)
            if (hotel) {
                await this.cacheService.set(cacheKey, hotel, 86400);
            }

            return hotel;
        } catch (error) {
            this.logger.error(`Failed to fetch content details for hotel ${hotelCode}:`, error);
            return null;
        }
    }

    /**
     * Helper to resolve the full base URL for Hotelbeds images
     */
    getHotelbedsImageUrl(imagePath: string): string {
        if (!imagePath) return '';
        // Standard hotelbeds photos endpoint
        // Sometimes it starts with http, otherwise we prepend their CDN
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        // According to docs, they usually just provide the path like '10/1000/1000.jpg'
        return `https://photos.hotelbeds.com/giata/${imagePath}`;
    }
}

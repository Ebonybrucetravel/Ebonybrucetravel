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
     * Get details for multiple hotels in bulk.
     * Uses the /hotels endpoint which allows fetching up to 100 hotels at once.
     */
    async getHotelsDetailsBulk(hotelCodes: string[], language: string = 'ENG'): Promise<any[]> {
        if (!hotelCodes.length) return [];

        const results: any[] = new Array(hotelCodes.length).fill(null);
        const codesToFetch: string[] = [];
        const codeToIndexMap = new Map<string, number>();

        // 1. Check cache first
        for (let i = 0; i < hotelCodes.length; i++) {
            const code = hotelCodes[i];
            const cacheKey = `hotelbeds:content:hotel:${code}:${language}`;
            const cached = await this.cacheService.get<any>(cacheKey);

            if (cached) {
                results[i] = cached;
            } else {
                codesToFetch.push(code);
                codeToIndexMap.set(code, i);
            }
        }

        if (codesToFetch.length === 0) {
            return results;
        }

        try {
            // Hotelbeds allows fetching multiple codes via the 'codes' query parameter
            // We'll process in chunks of 50 just to be safe, though they allow more.
            const chunkSize = 50;
            for (let i = 0; i < codesToFetch.length; i += chunkSize) {
                const chunk = codesToFetch.slice(i, i + chunkSize);
                const response = await this.fetchContent<any>(`/hotels`, {
                    codes: chunk.join(','),
                    language,
                    from: '1',
                    to: chunk.length.toString(),
                    useSecondaryLanguage: 'true',
                });

                if (response && response.hotels) {
                    for (const hotel of response.hotels) {
                        const index = codeToIndexMap.get(hotel.code.toString());
                        if (index !== undefined) {
                            results[index] = hotel;
                            // Cache for 24 hours
                            const cacheKey = `hotelbeds:content:hotel:${hotel.code}:${language}`;
                            await this.cacheService.set(cacheKey, hotel, 86400);
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Failed to fetch bulk content details for hotels: ${codesToFetch.join(',')}`, error);
        }

        return results;
    }

    /**
     * Helper to resolve the full GIATA CDN URL for Hotelbeds images.
     * @param imagePath  Path returned from the Content API (e.g. '10/1000/1000.jpg')
     * @param size       Optional size variant: 'small' (74px), 'medium' (117px), 'bigger' (800px),
     *                   'xl' (1024px), 'xxl' (2048px), 'original'. Default = standard 320px.
     *
     * GIATA CDN format:
     *   https://photos.hotelbeds.com/giata/{path}          → 320px (default)
     *   https://photos.hotelbeds.com/giata/small/{path}    → 74px thumbnail
     *   https://photos.hotelbeds.com/giata/bigger/{path}   → 800px
     */
    getHotelbedsImageUrl(imagePath: string, size?: 'small' | 'medium' | 'bigger' | 'xl' | 'xxl' | 'original'): string {
        if (!imagePath) return '';
        if (imagePath.startsWith('http')) return imagePath;

        const sizePrefix = size ? `${size}/` : '';
        return `https://photos.hotelbeds.com/giata/${sizePrefix}${imagePath}`;
    }
}

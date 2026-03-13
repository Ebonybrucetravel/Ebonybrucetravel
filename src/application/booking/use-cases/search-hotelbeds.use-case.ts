import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { HotelbedsService } from '@infrastructure/external-apis/hotelbeds/hotelbeds.service';
import { HotelbedsContentService } from '@infrastructure/external-apis/hotelbeds/hotelbeds-content.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { SearchHotelbedsDto } from '@presentation/booking/dto/hotelbeds/search-hotelbeds.dto';
import { ProductType } from '@prisma/client';

// Add proper type definitions
interface HotelbedsHotel {
    code: number;
    name: string;
    latitude: string;
    longitude: string;
    categoryCode?: string;
    categoryName?: string;
    destinationCode?: string;
    destinationName?: string;
    zoneName?: string;
    currency?: string;
    rooms?: HotelbedsRoom[];
    images?: HotelbedsImage[];
}

interface HotelbedsRoom {
    code: string;
    name: string;
    rates?: HotelbedsRate[];
}

interface HotelbedsRate {
    rateKey: string;
    net: string;
    boardName: string;
    boardCode: string;
    cancellationPolicies?: any[];
    [key: string]: any;
}

interface HotelbedsImage {
    path: string;
    roomCode?: string;
    imageTypeCode: 'HOTEL' | 'ROOM' | 'FACILITY';
    order?: number;
}

interface HotelbedsContent {
    images?: HotelbedsImage[];
    name?: { content: string };
    description?: { content: string };
    address?: { content: string };
    city?: { content: string };
    phones?: any[];
    facilities?: Array<{ description?: { content: string } }>;
    categoryCode?: string;
}

@Injectable()
export class SearchHotelbedsUseCase {
    private readonly logger = new Logger(SearchHotelbedsUseCase.name);
    private readonly BATCH_SIZE = 5; // Process hotels in batches
    private readonly BATCH_DELAY_MS = 200; // Delay between batches

    constructor(
        private readonly hotelbedsService: HotelbedsService,
        private readonly hotelbedsContentService: HotelbedsContentService,
        private readonly markupRepository: MarkupRepository,
        private readonly cacheService: CacheService,
        private readonly currencyService: CurrencyService,
    ) { }

    async execute(searchParams: SearchHotelbedsDto) {
        const {
            hotelIds,
            destinationCode,
            checkInDate,
            checkOutDate,
            occupancies,
            language = 'ENG',
            currency = 'GBP',
        } = searchParams;

        this.validateSearchParams(hotelIds, destinationCode, checkInDate, checkOutDate);

        try {
            this.logger.log(`Searching Hotelbeds availability. CheckIn: ${checkInDate}, Destination: ${destinationCode || 'N/A'}`);

            const response = await this.hotelbedsService.searchHotels({
                checkInDate,
                checkOutDate,
                destinationCode,
                hotelIds,
                occupancies: this.formatOccupancies(occupancies),
                language,
            });

            if (!response?.hotels?.hotels?.length) {
                return this.createEmptyResponse();
            }

            const markupConfigs = await this.markupRepository.findActiveMarkups();
            const { markupPercentage, markupFlatFee } = this.getMarkupConfig(markupConfigs);

            // Process hotels in batches to avoid rate limiting
            const enrichedHotels = await this.processHotelsInBatches(
                response.hotels.hotels,
                language,
                markupPercentage,
                markupFlatFee,
                currency
            );

            return this.formatResponse(enrichedHotels, response.hotels, currency);

        } catch (error: any) {
            this.handleError(error);
        }
    }

    private validateSearchParams(
        hotelIds: string[] | undefined,
        destinationCode: string | undefined,
        checkInDate: string,
        checkOutDate: string
    ): void {
        if (!hotelIds?.length && !destinationCode) {
            throw new BadRequestException('Either hotelIds or destinationCode must be provided');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);

        if (checkIn < today) {
            throw new BadRequestException(
                `Check-in date (${checkInDate}) cannot be in the past. Please select a future date.`
            );
        }

        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        if (checkOut <= checkIn) {
            throw new BadRequestException(
                `Check-out date (${checkOutDate}) must be after check-in date (${checkInDate}).`
            );
        }
    }

    private formatOccupancies(occupancies: any[]): any[] {
        return occupancies.map(occ => ({
            ...occ,
            paxes: occ.paxes?.map((p: any) => ({
                type: p.type,
                age: p.age ?? (p.type === 'AD' ? 30 : 5)
            }))
        }));
    }

    private getMarkupConfig(markupConfigs: any[]): { markupPercentage: number; markupFlatFee: number } {
        const defaultMarkup = markupConfigs.find(
            (m) => m.productType === ProductType.HOTEL && m.isActive
        );
        const supplierMarkup = markupConfigs.find(
            (m) => m.productType === ProductType.HOTEL && (m as any).supplierCode === 'HOTELBEDS'
        );

        const markupToApply = supplierMarkup || defaultMarkup;
        return {
            markupPercentage: markupToApply ? Number(markupToApply.markupPercentage) : 0,
            markupFlatFee: markupToApply ? Number(markupToApply.serviceFeeAmount) : 0,
        };
    }

    private async processHotelsInBatches(
        hotels: any[],
        language: string,
        markupPercentage: number,
        markupFlatFee: number,
        targetCurrency: string
    ): Promise<any[]> {
        const enrichedHotels = [];

        for (let i = 0; i < hotels.length; i += this.BATCH_SIZE) {
            const batch = hotels.slice(i, i + this.BATCH_SIZE);
            
            const batchResults = await Promise.all(
                batch.map(hotel => 
                    this.enrichHotel(hotel, language, markupPercentage, markupFlatFee, targetCurrency)
                )
            );
            
            enrichedHotels.push(...batchResults);

            // Add delay between batches to avoid rate limiting
            if (i + this.BATCH_SIZE < hotels.length) {
                await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY_MS));
            }
        }

        return enrichedHotels;
    }

    private async enrichHotel(
        hotel: any,
        language: string,
        markupPercentage: number,
        markupFlatFee: number,
        targetCurrency: string
    ): Promise<any> {
        let content: HotelbedsContent | null = null;
        
        try {
            content = await this.hotelbedsContentService.getHotelDetails(hotel.code.toString(), language);
        } catch (err) {
            this.logger.warn(`Could not load content/images for Hotelbeds hotel ${hotel.code}`, {
                error: err instanceof Error ? err.message : 'Unknown error',
                hotelCode: hotel.code
            });
        }

        // Format Images with proper property name and filtering
        const images = this.formatImages(content);
        
        // Create room image mapping
        const roomImagesMap = this.createRoomImagesMap(images);

        // Format Rooms & Prices
        const enrichedRooms = await this.enrichRooms(
            hotel.rooms || [],
            hotel.currency || 'EUR',
            markupPercentage,
            markupFlatFee,
            targetCurrency,
            roomImagesMap
        );

        return {
            ...hotel,
            content: this.formatContent(content, hotel),
            images,
            rooms: enrichedRooms,
        };
    }

    private formatImages(content: HotelbedsContent | null): any[] {
        if (!content?.images?.length) return [];

        return content.images
            .map((img: HotelbedsImage) => ({
                path: this.hotelbedsContentService.getHotelbedsImageUrl(img.path),
                roomCode: img.roomCode,
                type: img.imageTypeCode,
                order: img.order,
            }))
            .filter(img => img.path); // Remove invalid images
    }

    private createRoomImagesMap(images: any[]): Map<string, any[]> {
        const roomImagesMap = new Map();
        
        images.forEach(img => {
            if (img.roomCode) {
                if (!roomImagesMap.has(img.roomCode)) {
                    roomImagesMap.set(img.roomCode, []);
                }
                roomImagesMap.get(img.roomCode).push(img);
            }
        });
        
        return roomImagesMap;
    }

    private formatContent(content: HotelbedsContent | null, hotel: any): any {
        return {
            name: content?.name?.content || hotel.name,
            description: content?.description?.content || '',
            address: content?.address?.content || '',
            city: content?.city?.content || '',
            phones: content?.phones || [],
            facilities: content?.facilities || [],
            categoryCode: content?.categoryCode,
        };
    }

    private async enrichRooms(
        rooms: HotelbedsRoom[],
        originalCurrency: string,
        markupPercentage: number,
        markupFlatFee: number,
        targetCurrency: string,
        roomImagesMap: Map<string, any[]>
    ): Promise<any[]> {
        const enrichedRooms = [];

        for (const room of rooms) {
            const roomImages = roomImagesMap.get(room.code) || [];
            
            const enrichedRates = await this.enrichRates(
                room.rates || [],
                originalCurrency,
                markupPercentage,
                markupFlatFee,
                targetCurrency
            );

            enrichedRooms.push({
                ...room,
                name: room.name || room.code || 'Room',
                rates: enrichedRates,
                images: roomImages, // Include room-specific images
            });
        }

        return enrichedRooms;
    }

    private async enrichRates(
        rates: HotelbedsRate[],
        originalCurrency: string,
        markupPercentage: number,
        markupFlatFee: number,
        targetCurrency: string
    ): Promise<any[]> {
        const enrichedRates = [];

        for (const rate of rates) {
            try {
                const originalAmount = parseFloat(rate.net);
                
                if (isNaN(originalAmount)) {
                    this.logger.warn(`Invalid rate amount for rate ${rate.rateKey}`);
                    continue;
                }

                // 1. Convert to target currency
                const convertedBasePrice = await this.currencyService.convert(
                    originalAmount,
                    originalCurrency,
                    targetCurrency
                );

                // 2. Apply conversion fee/buffer
                const conversionDetails = this.currencyService.calculateConversionFee(
                    convertedBasePrice,
                    originalCurrency,
                    targetCurrency
                );

                // 3. Apply Markup
                const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;
                const finalPrice = conversionDetails.totalWithFee + markupAmount + markupFlatFee;

                enrichedRates.push({
                    ...rate,
                    originalNet: rate.net,
                    originalCurrency: originalCurrency,
                    baseAmount: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                    conversionFee: this.currencyService.formatAmount(conversionDetails.conversionFee, targetCurrency),
                    markupAmount: this.currencyService.formatAmount(markupAmount, targetCurrency),
                    finalAmount: this.currencyService.formatAmount(finalPrice, targetCurrency),
                    currency: targetCurrency,
                });
            } catch (error) {
                this.logger.error(`Failed to process rate ${rate.rateKey}`, error);
                // Skip this rate instead of failing the entire request
                continue;
            }
        }

        return enrichedRates;
    }

    private formatResponse(enrichedHotels: any[], hotelsMeta: any, currency: string): any {
        return {
            data: enrichedHotels.map(hotel => ({
                hotel: {
                    hotelId: hotel.code.toString(),
                    name: hotel.content.name,
                    latitude: hotel.latitude,
                    longitude: hotel.longitude,
                    address: hotel.content.address,
                    city: hotel.content.city,
                    description: hotel.content.description,
                    phones: hotel.content.phones,
                    facilities: hotel.content.facilities,
                    amenities: hotel.content.facilities
                        ?.map((f: any) => f.description?.content)
                        .filter(Boolean) || [],
                    categoryCode: hotel.categoryCode || hotel.content.categoryCode,
                    categoryName: hotel.categoryName,
                    destinationCode: hotel.destinationCode,
                    destinationName: hotel.destinationName,
                    zoneName: hotel.zoneName,
                    currency: hotel.currency || 'EUR',
                },
                offers: hotel.rooms.flatMap((room: any) =>
                    room.rates.map((rate: any) => ({
                        id: rate.rateKey,
                        rateCode: rate.rateKey,
                        room: {
                            type: room.name,
                            code: room.code,
                            images: room.images, // Include room images in offers
                        },
                        boardName: rate.boardName,
                        boardCode: rate.boardCode,
                        seller: 'Hotelbeds',
                        price: {
                            currency: rate.currency,
                            base: rate.baseAmount,
                            total: rate.finalAmount,
                            markup_amount: rate.markupAmount,
                            conversionFee: rate.conversionFee,
                        },
                        cancellationPolicies: rate.cancellationPolicies,
                    }))
                ),
                primaryImageUrl: hotel.images?.[0]?.path || null,
                allImages: hotel.images || [],
            })),
            meta: {
                total: hotelsMeta.total,
                count: enrichedHotels.length,
                checkIn: hotelsMeta.checkIn,
                checkOut: hotelsMeta.checkOut,
            },
            currency: currency
        };
    }

    private createEmptyResponse(): any {
        return {
            available: false,
            hotels: [],
            data: [],
            meta: {
                total: 0,
                count: 0,
            },
        };
    }

    private handleError(error: any): never {
        if (error instanceof HttpException) {
            throw error;
        }
        
        this.logger.error('Failed to search Hotelbeds:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        
        throw new HttpException(
            'Failed to search Hotelbeds availability. Service may be unavailable.',
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}

import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { HotelbedsService } from '@infrastructure/external-apis/hotelbeds/hotelbeds.service';
import { HotelbedsContentService } from '@infrastructure/external-apis/hotelbeds/hotelbeds-content.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { SearchHotelbedsDto } from '@presentation/booking/dto/hotelbeds/search-hotelbeds.dto';
import { ProductType } from '@prisma/client';

// Interfaces for better type safety
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
    imageTypeCode?: string;
    visualOrder?: number;
    order?: number;
    type?: {
        code: string;
        description: string;
    };
}

interface HotelbedsContent {
    images?: HotelbedsImage[];
    name?: { content: string };
    description?: { content: string };
    address?: { content: string };
    city?: { content: string };
    phones?: any[];
    facilities?: Array<{
        facilityCode: number;
        facilityGroupCode: number;
        description?: { content: string } | string;
        indLogic?: boolean;
        indYesOrNo?: boolean;
    }>;
    categoryCode?: string;
}

@Injectable()
export class SearchHotelbedsUseCase {
    private readonly logger = new Logger(SearchHotelbedsUseCase.name);

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
            page = 1,
            limit = 20,
        } = searchParams;

        this.validateSearchParams(hotelIds, destinationCode, checkInDate, checkOutDate);

        // Clamped pagination
        const safeLimit = Math.min(limit, 100);
        const from = (page - 1) * safeLimit + 1;
        const to = page * safeLimit;

        try {
            this.logger.log(
                `Searching Hotelbeds. In: ${checkInDate}, Destination: ${destinationCode || 'IDs'}, Page: ${page}, Limit: ${safeLimit}`,
            );

            const response = await this.hotelbedsService.searchHotels({
                checkInDate,
                checkOutDate,
                destinationCode,
                hotelIds,
                occupancies: this.formatOccupancies(occupancies),
                language,
                from,
                to,
            });

            if (!response?.hotels?.hotels?.length) {
                return this.createEmptyResponse(page, safeLimit);
            }

            // --- Pre-fetch exchange rate ONCE for performance ---
            const supplierCurrency = 'EUR';
            let exchangeRate = 1;
            if (currency !== supplierCurrency) {
                try {
                    exchangeRate = await this.currencyService.convert(1, supplierCurrency, currency);
                } catch {
                    this.logger.warn(`Could not fetch rate ${supplierCurrency}->${currency}. Using 1:1.`);
                }
            }

            // --- Markup config ---
            const markupConfigs = await this.markupRepository.findActiveMarkups();
            const { markupPercentage, markupFlatFee } = this.getMarkupConfig(markupConfigs);

            const hotelsToEnrich = response.hotels.hotels;
            const hotelCodes = hotelsToEnrich.map((h: any) => h.code.toString());

            // --- Bulk-fetch static content (non-blocking) ---
            let allContent: any[] = new Array(hotelCodes.length).fill(null);
            try {
                allContent = await this.hotelbedsContentService.getHotelsDetailsBulk(hotelCodes, language);
            } catch (err: any) {
                this.logger.warn(`Bulk content fetch failed: ${err?.message || err}`);
            }

            const conversionBuffer = this.currencyService.getConversionBuffer();

            const enrichedHotels = hotelsToEnrich.map((hotel: any, index: number) => {
                const content = allContent[index] as HotelbedsContent | null;

                // --- GIATA Image Mapping ---
                const rawImages = content?.images || (content as any)?.image || [];
                const images = this.mapImages(rawImages);
                const roomImagesMap = this.createRoomImagesMap(images);

                // --- GIATA Facility/Amenity Mapping ---
                const { hotelFacilities, amenities } = this.mapFacilities(content?.facilities || []);

                // --- Rooms & Rates (Synchronous computation) ---
                const enrichedRooms = this.enrichRooms(
                    hotel.rooms || [],
                    hotel.currency || supplierCurrency,
                    currency,
                    exchangeRate,
                    conversionBuffer,
                    markupPercentage,
                    markupFlatFee,
                    roomImagesMap
                );

                return {
                    ...hotel,
                    content: {
                        name: content?.name?.content || hotel.name,
                        description: content?.description?.content || '',
                        address: content?.address?.content || '',
                        city: content?.city?.content || '',
                        phones: content?.phones || [],
                        facilities: hotelFacilities,
                        categoryCode: content?.categoryCode,
                    },
                    images,
                    rooms: enrichedRooms,
                    amenities,
                };
            });

            return this.formatResponse(enrichedHotels, response.hotels, page, safeLimit, from, to, currency);

        } catch (error: any) {
            this.handleError(error);
        }
    }

    private validateSearchParams(
        hotelIds: number[] | undefined,
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
            throw new BadRequestException(`Check-in date (${checkInDate}) cannot be in the past.`);
        }

        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        if (checkOut <= checkIn) {
            throw new BadRequestException(`Check-out date (${checkOutDate}) must be after check-in date.`);
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
        const defaultMarkup = markupConfigs.find(m => m.productType === ProductType.HOTEL && m.isActive);
        const supplierMarkup = markupConfigs.find(m => m.productType === ProductType.HOTEL && (m as any).supplierCode === 'HOTELBEDS');
        const markupToApply = supplierMarkup || defaultMarkup;
        return {
            markupPercentage: markupToApply ? Number(markupToApply.markupPercentage) : 0,
            markupFlatFee: markupToApply ? Number(markupToApply.serviceFeeAmount) : 0,
        };
    }

    private mapImages(rawImages: any[]): any[] {
        if (!Array.isArray(rawImages)) return [];
        return rawImages
            .sort((a: any, b: any) => (a.visualOrder ?? 999) - (b.visualOrder ?? 999))
            .map((img: any) => ({
                path: this.hotelbedsContentService.getHotelbedsImageUrl(img.path),
                thumbPath: this.hotelbedsContentService.getHotelbedsImageUrl(img.path, 'small'),
                bigPath: this.hotelbedsContentService.getHotelbedsImageUrl(img.path, 'bigger'),
                roomCode: img.roomCode || null,
                type: img.type?.code || img.imageTypeCode || null,
                typeDescription: img.type?.description || null,
                isMain: img.visualOrder === 0,
                order: img.visualOrder ?? img.order ?? 999,
            }));
    }

    private createRoomImagesMap(images: any[]): Map<string, any[]> {
        const map = new Map();
        images.forEach(img => {
            if (img.roomCode) {
                if (!map.has(img.roomCode)) map.set(img.roomCode, []);
                map.get(img.roomCode).push(img);
            }
        });
        return map;
    }

    private mapFacilities(facilities: any[]): { hotelFacilities: any[], amenities: string[] } {
        const hotelFacilities = facilities.filter(f => f.facilityGroupCode === 70);
        const roomFacilities = facilities.filter(
            f => f.facilityGroupCode === 60 && f.indLogic !== false && f.indYesOrNo !== false
        );
        const amenities = roomFacilities
            .map(f => (typeof f.description === 'string' ? f.description : f.description?.content))
            .filter(Boolean);
        return { hotelFacilities, amenities };
    }

    private enrichRooms(
        rooms: any[],
        hotelCurrency: string,
        targetCurrency: string,
        exchangeRate: number,
        conversionBuffer: number,
        markupPercentage: number,
        markupFlatFee: number,
        roomImagesMap: Map<string, any[]>
    ): any[] {
        return rooms.map(room => {
            const enrichedRates = (room.rates || []).map((rate: any) => {
                const originalAmount = parseFloat(rate.net);
                const rateToUse = hotelCurrency === targetCurrency ? 1 : exchangeRate;
                const convertedBase = originalAmount * rateToUse;

                const conversionFee = targetCurrency !== hotelCurrency
                    ? (convertedBase * conversionBuffer) / 100
                    : 0;
                const totalWithFee = convertedBase + conversionFee;

                const markupAmount = (totalWithFee * markupPercentage) / 100;
                const finalPrice = totalWithFee + markupAmount + markupFlatFee;

                return {
                    ...rate,
                    originalNet: rate.net,
                    originalCurrency: hotelCurrency,
                    baseAmount: convertedBase.toFixed(2),
                    conversionFee: conversionFee.toFixed(2),
                    markupAmount: markupAmount.toFixed(2),
                    finalAmount: finalPrice.toFixed(2),
                    currency: targetCurrency,
                };
            });

            return {
                ...room,
                name: room.name || room.code || 'Room',
                rates: enrichedRates,
                images: roomImagesMap.get(room.code) || [],
            };
        });
    }

    private formatResponse(
        enrichedHotels: any[],
        hotelsMeta: any,
        page: number,
        limit: number,
        from: number,
        to: number,
        currency: string
    ): any {
        return {
            data: enrichedHotels.map(hotel => ({
                hotel: {
                    hotelId: hotel.code.toString(),
                    name: hotel.content.name || hotel.name,
                    latitude: hotel.latitude,
                    longitude: hotel.longitude,
                    address: hotel.content.address,
                    city: hotel.content.city,
                    description: hotel.content.description,
                    phones: hotel.content.phones,
                    facilities: hotel.content.facilities,
                    amenities: hotel.amenities,
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
                            images: room.images,
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
                page,
                limit,
                from,
                to,
                checkIn: hotelsMeta.checkIn,
                checkOut: hotelsMeta.checkOut,
            },
            currency,
        };
    }

    private createEmptyResponse(page: number, limit: number): any {
        return {
            available: false,
            hotels: [],
            data: [],
            meta: {
                total: 0,
                count: 0,
                page,
                limit,
            },
        };
    }

    private handleError(error: any): never {
        if (error instanceof HttpException) {
            throw error;
        }
        this.logger.error('Failed to search Hotelbeds:', error);
        throw new HttpException(
            'Failed to search Hotelbeds availability. Service may be unavailable.',
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}

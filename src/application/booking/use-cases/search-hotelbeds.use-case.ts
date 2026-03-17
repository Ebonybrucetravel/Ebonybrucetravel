import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { HotelbedsService } from '@infrastructure/external-apis/hotelbeds/hotelbeds.service';
import { HotelbedsContentService } from '@infrastructure/external-apis/hotelbeds/hotelbeds-content.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { SearchHotelbedsDto } from '@presentation/booking/dto/hotelbeds/search-hotelbeds.dto';
import { ProductType } from '@prisma/client';

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

        // Validate that at least one search method is provided
        if (!hotelIds?.length && !destinationCode) {
            throw new BadRequestException(
                'Either hotelIds or destinationCode must be provided',
            );
        }

        // Validate dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);

        if (checkIn < today) {
            throw new BadRequestException(
                `Check-in date (${checkInDate}) cannot be in the past. Please select a future date.`,
            );
        }

        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        if (checkOut <= checkIn) {
            throw new BadRequestException(
                `Check-out date (${checkOutDate}) must be after check-in date (${checkInDate}).`,
            );
        }

        // Clamp limit: Hotelbeds maximum is 2000, but we cap at 100 for performance
        const safeLimit = Math.min(limit, 100);
        const from = (page - 1) * safeLimit + 1;
        const to = page * safeLimit;

        try {
            this.logger.log(
                `Searching Hotelbeds availability. CheckIn: ${checkInDate}, Destination: ${destinationCode || 'N/A'}, Page: ${page}, Limit: ${safeLimit}`,
            );

            const response = await this.hotelbedsService.searchHotels({
                checkInDate,
                checkOutDate,
                destinationCode,
                hotelIds,
                occupancies: occupancies.map(occ => ({
                    ...occ,
                    paxes: occ.paxes?.map(p => ({
                        type: p.type,
                        age: p.age ?? (p.type === 'AD' ? 30 : 5),
                    })),
                })),
                language,
                from,
                to,
            });

            if (!response || !response.hotels || !response.hotels.hotels) {
                return {
                    available: false,
                    hotels: [],
                    meta: { total: 0, count: 0, page, limit: safeLimit },
                };
            }

            // --- Pre-fetch exchange rate ONCE ---
            // This avoids hundreds of individual convert() calls (which caused 45s response times).
            const supplierCurrency = 'EUR';
            let exchangeRate = 1;
            if (currency !== supplierCurrency) {
                try {
                    exchangeRate = await this.getExchangeRate(supplierCurrency, currency);
                } catch {
                    this.logger.warn(`Could not fetch exchange rate ${supplierCurrency}->${currency}. Using 1:1.`);
                }
            }

            // --- Markup config ---
            const markupConfigs = await this.markupRepository.findActiveMarkups();
            const defaultMarkup = markupConfigs.find(m => m.productType === ProductType.HOTEL && m.isActive);
            const supplierMarkup = markupConfigs.find(m => m.productType === ProductType.HOTEL && (m as any).supplierCode === 'HOTELBEDS');
            const markupToApply = supplierMarkup || defaultMarkup;
            const markupPercentage = markupToApply ? Number(markupToApply.markupPercentage) : 0;
            const markupFlatFee = markupToApply ? Number(markupToApply.serviceFeeAmount) : 0;

            const hotelsToEnrich = response.hotels.hotels;
            const hotelCodes = hotelsToEnrich.map((h: any) => h.code.toString());

            // --- Bulk-fetch static content (images, descriptions, facilities) ---
            // Non-blocking: if the Content API fails (e.g. 403 quota), we still return results.
            let allContent: any[] = new Array(hotelCodes.length).fill(null);
            try {
                allContent = await this.hotelbedsContentService.getHotelsDetailsBulk(hotelCodes, language);
            } catch (err: any) {
                this.logger.warn(
                    `Content API fetch failed (search will proceed without images/details): ${err?.message || err}`,
                );
            }

            const conversionBuffer = this.currencyService.getConversionBuffer();

            const enrichedHotels = hotelsToEnrich.map((hotel: any, index: number) => {
                const content = allContent[index];

                // --- Images (GIATA format) ---
                // The bulk /hotels endpoint returns them under 'images'
                const rawImages: any[] = content?.images || content?.image || [];
                const images = Array.isArray(rawImages)
                    ? rawImages
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
                        }))
                    : [];

                // --- Facilities (GIATA Group 60 = Room, Group 70 = Hotel) ---
                const allFacilities: any[] = content?.facilities || [];
                const hotelFacilities = allFacilities.filter((f: any) => f.facilityGroupCode === 70);
                const roomFacilities = allFacilities.filter(
                    (f: any) => f.facilityGroupCode === 60 && f.indLogic !== false && f.indYesOrNo !== false,
                );
                const amenities = roomFacilities
                    .map((f: any) => f.description?.content || f.description)
                    .filter(Boolean);

                // --- Rooms & Rates (synchronous price calculation) ---
                const enrichedRooms = (hotel.rooms || []).map((room: any) => {
                    const enrichedRates = (room.rates || []).map((rate: any) => {
                        const originalAmount = parseFloat(rate.net);
                        const hotelCurrency = hotel.currency || supplierCurrency;

                        // Apply exchange rate
                        const rateToUse = hotelCurrency === currency ? 1 : exchangeRate;
                        const convertedBase = originalAmount * rateToUse;

                        // Apply conversion buffer
                        const conversionFee = currency !== hotelCurrency
                            ? (convertedBase * conversionBuffer) / 100
                            : 0;
                        const totalWithFee = convertedBase + conversionFee;

                        // Apply markup
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
                            currency,
                        };
                    });

                    return { ...room, rates: enrichedRates };
                });

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
                        currency: hotel.currency || supplierCurrency,
                    },
                    offers: hotel.rooms.flatMap((room: any) =>
                        room.rates.map((rate: any) => ({
                            id: rate.rateKey,
                            rateCode: rate.rateKey,
                            room: {
                                type: room.name,
                                code: room.code,
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
                    total: response.hotels.total,
                    count: enrichedHotels.length,
                    page,
                    limit: safeLimit,
                    from,
                    to,
                    checkIn: response.hotels.checkIn,
                    checkOut: response.hotels.checkOut,
                },
                currency,
            };

        } catch (error: any) {
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

    /**
     * Pre-fetch a single exchange rate to avoid repeated API calls.
     * Internally delegates to CurrencyService which already caches rates.
     */
    private async getExchangeRate(from: string, to: string): Promise<number> {
        // currencyService.convert(1, from, to) returns the rate for 1 unit
        return this.currencyService.convert(1, from, to);
    }
}

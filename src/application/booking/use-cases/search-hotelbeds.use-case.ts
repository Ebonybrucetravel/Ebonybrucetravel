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
            currency = 'GBP', // Currently display-only. Actual rate is in supplier default
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

        try {
            this.logger.log(`Searching Hotelbeds availability. CheckIn: ${checkInDate}, Destination: ${destinationCode || 'N/A'}`);

            const response = await this.hotelbedsService.searchHotels({
                checkInDate,
                checkOutDate,
                destinationCode,
                hotelIds,
                occupancies: occupancies.map(occ => ({
                    ...occ,
                    paxes: occ.paxes?.map(p => ({
                        type: p.type,
                        age: p.age ?? (p.type === 'AD' ? 30 : 5) // Fallback for types
                    }))
                })),
                language,
            });

            if (!response || !response.hotels || !response.hotels.hotels) {
                return {
                    available: false,
                    hotels: [],
                };
            }

            // 1. Get Markup configs to apply our B2C pricing natively out-of-the-box
            const markupConfigs = await this.markupRepository.findActiveMarkups();
            const defaultMarkup = markupConfigs.find((m) => m.productType === ProductType.HOTEL && m.isActive);
            const supplierMarkup = markupConfigs.find((m) => m.productType === ProductType.HOTEL && (m as any).supplierCode === 'HOTELBEDS');

            const markupToApply = supplierMarkup || defaultMarkup;
            const markupPercentage = markupToApply ? Number(markupToApply.markupPercentage) : 0;
            const markupFlatFee = markupToApply ? Number(markupToApply.serviceFeeAmount) : 0;

            // 2. Fetch content details concurrently to enrich search results with images
            const enrichedHotels = await Promise.all(
                response.hotels.hotels.map(async (hotel: any) => {
                    let content = null;
                    try {
                        content = await this.hotelbedsContentService.getHotelDetails(hotel.code.toString(), language);
                    } catch (err) {
                        this.logger.warn(`Could not load content/images for Hotelbeds hotel ${hotel.code}`);
                    }

                    // Format Images
                    const images = content?.image ? content.image.map((img: any) => ({
                        path: this.hotelbedsContentService.getHotelbedsImageUrl(img.path),
                        roomCode: img.roomCode,
                        type: img.imageTypeCode,
                    })) : [];

                    // Format Rooms & Prices
                    const enrichedRooms = hotel.rooms?.map((room: any) => {
                        const enrichedRates = room.rates?.map((rate: any) => {
                            const originalAmount = parseFloat(rate.net);
                            let finalAmount = originalAmount;
                            if (markupToApply) {
                                finalAmount = originalAmount + (originalAmount * markupPercentage) / 100 + markupFlatFee;
                            }

                            return {
                                ...rate,
                                originalNet: rate.net,     // keep raw
                                sellingRate: rate.sellingRate,
                                finalAmount: finalAmount.toFixed(2), // formatted for display
                                currency: hotel.currency || 'EUR',
                            };
                        });

                        return {
                            ...room,
                            rates: enrichedRates,
                        };
                    });

                    return {
                        ...hotel,
                        content: {
                            name: content?.name?.content || hotel.name,
                            description: content?.description?.content || '',
                            address: content?.address?.content || '',
                            city: content?.city?.content || '',
                            phones: content?.phones || [],
                            facilities: content?.facilities || [],
                            categoryCode: content?.categoryCode,
                        },
                        images,
                        rooms: enrichedRooms,
                    };
                })
            );

            return {
                available: enrichedHotels.length > 0,
                hotels: enrichedHotels,
                checkIn: response.hotels.checkIn,
                total: response.hotels.total,
                currency: enrichedHotels[0]?.currency || 'EUR'
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
}

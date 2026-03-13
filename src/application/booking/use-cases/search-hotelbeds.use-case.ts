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

            const markupConfigs = await this.markupRepository.findActiveMarkups();
            const defaultMarkup = markupConfigs.find((m) => m.productType === ProductType.HOTEL && m.isActive);
            const supplierMarkup = markupConfigs.find((m) => m.productType === ProductType.HOTEL && (m as any).supplierCode === 'HOTELBEDS');

            const markupToApply = supplierMarkup || defaultMarkup;
            const markupPercentage = markupToApply ? Number(markupToApply.markupPercentage) : 0;
            const markupFlatFee = markupToApply ? Number(markupToApply.serviceFeeAmount) : 0;

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
                    const enrichedRooms = await Promise.all((hotel.rooms || []).map(async (room: any) => {
                        const enrichedRates = await Promise.all((room.rates || []).map(async (rate: any) => {
                            const originalAmount = parseFloat(rate.net);
                            const originalCurrency = hotel.currency || 'EUR';

                            // 1. Convert to target currency
                            const convertedBasePrice = await this.currencyService.convert(
                                originalAmount,
                                originalCurrency,
                                currency // targetCurrency
                            );

                            // 2. Apply conversion fee/buffer
                            const conversionDetails = this.currencyService.calculateConversionFee(
                                convertedBasePrice,
                                originalCurrency,
                                currency
                            );

                            // 3. Apply Markup to the total with conversion fee
                            const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;
                            const finalPrice = conversionDetails.totalWithFee + markupAmount + markupFlatFee;

                            return {
                                ...rate,
                                originalNet: rate.net,
                                originalCurrency: originalCurrency,
                                baseAmount: this.currencyService.formatAmount(convertedBasePrice, currency),
                                conversionFee: this.currencyService.formatAmount(conversionDetails.conversionFee, currency),
                                markupAmount: this.currencyService.formatAmount(markupAmount, currency),
                                finalAmount: this.currencyService.formatAmount(finalPrice, currency),
                                currency: currency,
                            };
                        }));

                        return {
                            ...room,
                            rates: enrichedRates,
                        };
                    }));

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
                        amenities: hotel.content.facilities?.map((f: any) => f.description?.content).filter(Boolean) || [],
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
                    checkIn: response.hotels.checkIn,
                    checkOut: response.hotels.checkOut,
                },
                currency: currency
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

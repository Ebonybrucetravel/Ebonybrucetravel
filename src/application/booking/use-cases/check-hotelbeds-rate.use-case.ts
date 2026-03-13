import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { HotelbedsService } from '@infrastructure/external-apis/hotelbeds/hotelbeds.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { ProductType } from '@prisma/client';

@Injectable()
export class CheckHotelbedsRateUseCase {
    private readonly logger = new Logger(CheckHotelbedsRateUseCase.name);

    constructor(
        private readonly hotelbedsService: HotelbedsService,
        private readonly markupRepository: MarkupRepository,
        private readonly currencyService: CurrencyService,
    ) { }

    async execute(params: { rateKey: string; language?: string; currency?: string }) {
        const { rateKey, language, currency = 'GBP' } = params;
        if (!rateKey) {
            throw new BadRequestException('rateKey is required to check rates');
        }

        try {
            this.logger.log(`Checking Hotelbeds rate for key: ${rateKey.substring(0, 20)}...`);
            const response = await this.hotelbedsService.checkRates({ rateKey, language });

            if (!response || !response.hotel) {
                throw new HttpException('Rate no longer available or invalid rateKey', HttpStatus.GONE);
            }

            const hotel = response.hotel;

            const markupConfigs = await this.markupRepository.findActiveMarkups();
            const defaultMarkup = markupConfigs.find((m) => m.productType === ProductType.HOTEL && m.isActive);
            const supplierMarkup = markupConfigs.find((m) => m.productType === ProductType.HOTEL && (m as any).supplierCode === 'HOTELBEDS');

            const markupToApply = supplierMarkup || defaultMarkup;
            const markupPercentage = markupToApply ? Number(markupToApply.markupPercentage) : 0;
            const markupFlatFee = markupToApply ? Number(markupToApply.serviceFeeAmount) : 0;

            const unifiedOffers = await Promise.all((hotel.rooms || []).flatMap((room: any) =>
                (room.rates || []).map(async (rate: any) => {
                    const originalAmount = parseFloat(rate.net);
                    const originalCurrency = hotel.currency || 'EUR';

                    const convertedBasePrice = await this.currencyService.convert(
                        originalAmount,
                        originalCurrency,
                        currency
                    );

                    const conversionDetails = this.currencyService.calculateConversionFee(
                        convertedBasePrice,
                        originalCurrency,
                        currency
                    );

                    const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;
                    const finalPrice = conversionDetails.totalWithFee + markupAmount + markupFlatFee;

                    return {
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
                            currency: currency,
                            base: this.currencyService.formatAmount(convertedBasePrice, currency),
                            total: this.currencyService.formatAmount(finalPrice, currency),
                            markup_amount: this.currencyService.formatAmount(markupAmount, currency),
                            conversionFee: this.currencyService.formatAmount(conversionDetails.conversionFee, currency),
                        },
                        cancellationPolicies: rate.cancellationPolicies,
                        allotment: rate.allotment,
                    };
                })
            )) || [];

            return {
                hotel: {
                    hotelId: hotel.code.toString(),
                    name: hotel.name,
                    categoryCode: hotel.categoryCode,
                    categoryName: hotel.categoryName,
                    destinationCode: hotel.destinationCode,
                    destinationName: hotel.destinationName,
                    zoneCode: hotel.zoneCode,
                    zoneName: hotel.zoneName,
                    latitude: hotel.latitude,
                    longitude: hotel.longitude,
                    amenities: hotel.facilities?.map((f: any) => f.description?.content).filter(Boolean) || [],
                    facilities: hotel.facilities,
                    currency: currency,
                    checkIn: hotel.checkIn,
                    checkOut: hotel.checkOut,
                },
                offers: unifiedOffers,
                upsell: response.upsell,
                modificationPolicies: response.modificationPolicies,
            };

        } catch (error: any) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error('Failed to check Hotelbeds rate:', error);
            throw new HttpException(
                'Failed to validate rate with supplier. The rate might have expired.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}

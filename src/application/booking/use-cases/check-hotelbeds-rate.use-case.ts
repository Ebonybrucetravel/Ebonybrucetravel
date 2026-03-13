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

    async execute(params: { rateKey: string; language?: string }) {
        if (!params.rateKey) {
            throw new BadRequestException('rateKey is required to check rates');
        }

        try {
            this.logger.log(`Checking Hotelbeds rate for key: ${params.rateKey.substring(0, 20)}...`);
            const response = await this.hotelbedsService.checkRates(params);

            if (!response || !response.hotel) {
                throw new HttpException('Rate no longer available or invalid rateKey', HttpStatus.GONE);
            }

            const hotel = response.hotel;

            // Apply Markup
            const markupConfigs = await this.markupRepository.findActiveMarkups();
            const defaultMarkup = markupConfigs.find((m) => m.productType === ProductType.HOTEL && m.isActive);
            const supplierMarkup = markupConfigs.find((m) => m.productType === ProductType.HOTEL && (m as any).supplierCode === 'HOTELBEDS');

            const markupToApply = supplierMarkup || defaultMarkup;
            const markupPercentage = markupToApply ? Number(markupToApply.markupPercentage) : 0;
            const markupFlatFee = markupToApply ? Number(markupToApply.serviceFeeAmount) : 0;

            // Wrap response with markup
            const enrichedHotel = {
                ...hotel,
                rooms: hotel.rooms?.map((room: any) => ({
                    ...room,
                    rates: room.rates?.map((rate: any) => {
                        const originalAmount = parseFloat(rate.net);
                        let finalAmount = originalAmount;
                        if (markupToApply) {
                            finalAmount = originalAmount + (originalAmount * markupPercentage) / 100 + markupFlatFee;
                        }

                        return {
                            ...rate,
                            originalNet: rate.net,
                            finalAmount: finalAmount.toFixed(2),
                            currency: hotel.currency || 'EUR',
                        };
                    })
                }))
            };

            return {
                hotel: enrichedHotel,
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

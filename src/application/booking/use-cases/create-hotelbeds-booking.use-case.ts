import { Injectable, NotFoundException, BadRequestException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HotelbedsService } from '@infrastructure/external-apis/hotelbeds/hotelbeds.service';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { CreateHotelbedsBookingDto } from '@presentation/booking/dto/hotelbeds/create-hotelbeds-booking.dto';
import { BookingStatus, Provider, ProductType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class CreateHotelbedsBookingUseCase {
    private readonly logger = new Logger(CreateHotelbedsBookingUseCase.name);

    constructor(
        private readonly hotelbedsService: HotelbedsService,
        private readonly bookingService: BookingService,
        private readonly markupRepository: MarkupRepository,
        private readonly markupCalculationService: MarkupCalculationService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Step 1: Create local booking (before payment)
     */
    async execute(dto: CreateHotelbedsBookingDto, userId: string) {
        try {
            const {
                totalAmount,
                currency,
                cancellationDeadline,
                cancellationPolicySnapshot,
                policyAccepted,
                clientIp,
                userAgent,
                rateKey,
                guests,
                specialRequests
            } = dto;

            if (!policyAccepted) {
                throw new BadRequestException('You must agree to the cancellation policy.');
            }

            const deadlineUtc = new Date(cancellationDeadline);

            // Get markup config
            const markupConfig = await this.markupRepository.findActiveMarkupByProductType(ProductType.HOTEL, currency);
            if (!markupConfig) {
                throw new NotFoundException(`No active markup found for HOTEL in ${currency}`);
            }

            // Reverse calculate base price
            const serviceFee = Number(markupConfig.serviceFeeAmount || 0);
            const markupPercentage = Number(markupConfig.markupPercentage || 0);
            const basePrice = (totalAmount - serviceFee) / (1 + markupPercentage / 100);

            if (basePrice <= 0) {
                throw new BadRequestException('Invalid total amount.');
            }

            const leadGuest = guests[0];
            const passengerInfo = {
                firstName: leadGuest.firstName,
                lastName: leadGuest.lastName,
                email: leadGuest.email,
                phone: leadGuest.phone,
                guests: guests.map((g, i) => ({
                    travelerId: i + 1,
                    ...g
                })),
            };

            const booking = await this.bookingService.createBooking({
                userId,
                productType: ProductType.HOTEL,
                provider: Provider.HOTELBEDS,
                basePrice,
                markupAmount: totalAmount - basePrice - serviceFee,
                serviceFee,
                totalAmount,
                currency,
                bookingData: {
                    rateKey,
                    specialRequests,
                    guests: guests,
                    policyAcceptedAt: new Date(),
                    cancellationDeadline: deadlineUtc,
                },
                passengerInfo,
                status: BookingStatus.PENDING,
                paymentStatus: 'PENDING',
                cancellationDeadline: deadlineUtc,
                cancellationPolicySnapshot: cancellationPolicySnapshot.trim(),
                policyAcceptedAt: new Date(),
                ...(clientIp && { clientIp }),
                ...(userAgent && { userAgent }),
            });

            this.logger.log(`Created local Hotelbeds booking ${booking.id} for rateKey starting ${rateKey.substring(0, 10)}`);

            return {
                booking,
                message: 'Booking created. Please proceed to payment.',
            };
        } catch (error) {
            this.logger.error('Error in CreateHotelbedsBookingUseCase.execute:', error);
            if (error instanceof HttpException || error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException('Failed to create local booking.');
        }
    }

    /**
     * Step 2: Create actual Hotelbeds booking (after payment)
     */
    async createHotelbedsBookingAfterPayment(bookingId: string) {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId }
            });

            if (!booking || booking.provider !== Provider.HOTELBEDS) {
                throw new Error('Invalid booking for Hotelbeds provider');
            }

            if (booking.providerBookingId) {
                this.logger.warn(`Hotelbeds booking ${bookingId} already confirmed.`);
                return { orderId: booking.providerBookingId, orderData: booking.providerData };
            }

            const bookingData = booking.bookingData as any;
            const passengerInfo = booking.passengerInfo as any;

            // Prepare Hotelbeds API payload
            const hbxPayload = {
                holder: {
                    name: passengerInfo.firstName,
                    surname: passengerInfo.lastName,
                },
                rooms: [
                    {
                        rateKey: bookingData.rateKey,
                        paxes: bookingData.guests.map((g: any) => ({
                            type: 'AD', // Simplified for now, in a real scenario we'd map from DTO
                            name: g.firstName,
                            surname: g.lastName,
                        }))
                    }
                ],
                clientReference: booking.reference,
                remark: bookingData.specialRequests,
            };

            this.logger.log(`Confirming Hotelbeds booking ${bookingId} with HBX...`);
            const hbxResponse = await this.hotelbedsService.createBooking(hbxPayload);

            if (!hbxResponse || !hbxResponse.booking) {
                throw new Error('No booking returned from Hotelbeds API');
            }

            // Update local booking
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    providerBookingId: hbxResponse.booking.reference,
                    providerData: hbxResponse.booking,
                    status: BookingStatus.CONFIRMED,
                    paymentStatus: PaymentStatus.COMPLETED,
                }
            });

            this.logger.log(`Hotelbeds booking ${bookingId} CONFIRMED. Reference: ${hbxResponse.booking.reference}`);

            return {
                orderId: hbxResponse.booking.reference,
                orderData: hbxResponse.booking
            };

        } catch (error: any) {
            this.logger.error(`Failed to confirm Hotelbeds booking ${bookingId}:`, error);
            throw error;
        }
    }
}

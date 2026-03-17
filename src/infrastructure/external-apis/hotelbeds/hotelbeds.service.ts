import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class HotelbedsService {
    private readonly logger = new Logger(HotelbedsService.name);
    private readonly apiKey: string;
    private readonly apiSecret: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('HOTELBEDS_API_KEY') || '';
        this.apiSecret = this.configService.get<string>('HOTELBEDS_API_SECRET') || '';

        // Use test environment by default, production when HOTELBEDS_ENV=live
        const env = this.configService.get<string>('HOTELBEDS_ENV') || 'test';
        this.baseUrl =
            env === 'live'
                ? 'https://api.hotelbeds.com'
                : 'https://api.test.hotelbeds.com';

        if (!this.apiKey || !this.apiSecret) {
            this.logger.warn(
                'Hotelbeds API credentials not configured. Hotelbeds features will not work.',
            );
        }
    }

    /**
     * Generates the X-Signature header required for authenticating with Hotelbeds.
     * SHA256 hash of: API Key + Secret + Current timestamp (in seconds)
     */
    private generateSignature(): string {
        const timestampInSeconds = Math.floor(Date.now() / 1000).toString();
        const dataToHash = `${this.apiKey}${this.apiSecret}${timestampInSeconds}`;
        return crypto.createHash('sha256').update(dataToHash).digest('hex');
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Make an authenticated request to the Hotelbeds API
     */
    public async makeRequest(
        endpoint: string,
        options: {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
            body?: any;
            params?: Record<string, string>;
            isContentApi?: boolean;
        } = {},
        retryCount = 0
    ): Promise<any> {
        if (!this.apiKey || !this.apiSecret) {
            throw new HttpException(
                'Hotelbeds API credentials not configured',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const { method = 'GET', body, params, isContentApi = false } = options;
        const signature = this.generateSignature();

        // Construct correct base path based on whether it's the Booking or Content API
        const apiPrefix = isContentApi ? '/hotel-content-api/1.0' : '/hotel-api/1.0';
        let url = `${this.baseUrl}${apiPrefix}${endpoint}`;

        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        const headers: Record<string, string> = {
            'Api-key': this.apiKey,
            'X-Signature': signature,
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                if (response.status === 429 && retryCount < 1) {
                    // Add jitter: wait between 500ms and 1500ms
                    const jitter = Math.floor(Math.random() * 1000) + 500;
                    this.logger.warn(`Hotelbeds API rate limit (429) hit on ${endpoint}. Retrying in ${jitter}ms... (Retry ${retryCount + 1})`);
                    await this.sleep(jitter);
                    return this.makeRequest(endpoint, options, retryCount + 1);
                }

                const errorText = await response.text();
                this.logger.warn(`Hotelbeds API error ${response.status} ${endpoint}: ${errorText}`);

                let errorMessage = `Hotelbeds API error: ${response.status}`;
                let errorDetails: any = null;

                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error) {
                        errorMessage = errorJson.error.message || errorMessage;
                        errorDetails = errorJson.error;
                    }
                } catch {
                    errorMessage += ` - ${errorText.substring(0, 200)}`;
                }

                let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
                if (response.status === 401 || response.status === 403) {
                    httpStatus = HttpStatus.UNAUTHORIZED;
                } else if (response.status === 400 || response.status === 422) {
                    httpStatus = HttpStatus.BAD_REQUEST;
                } else if (response.status === 404) {
                    httpStatus = HttpStatus.NOT_FOUND;
                } else if (response.status === 429) {
                    httpStatus = HttpStatus.TOO_MANY_REQUESTS;
                }

                throw new HttpException(
                    {
                        message: errorMessage,
                        error: response.status === 403
                            ? 'Feature not available'
                            : response.status === 401
                                ? 'Authentication failed'
                                : response.status === 429
                                    ? 'Rate limit exceeded'
                                    : 'API error',
                        statusCode: httpStatus,
                        details: errorDetails,
                    },
                    httpStatus,
                );
            }

            return await response.json();
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                `Hotelbeds API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }



    /**
     * Search Hotels (Availability)
     * POST /hotel-api/1.0/hotels
     */
    async searchHotels(params: {
        checkInDate: string; // YYYY-MM-DD
        checkOutDate: string; // YYYY-MM-DD
        destinationCode?: string;
        hotelIds?: number[];
        occupancies: Array<{
            rooms: number;
            adults: number;
            children: number;
            paxes?: Array<{ type: 'AD' | 'CH'; age: number }>;
        }>;
        language?: string; // e.g. "ENG"
        from?: number; // Pagination: start index (1-based)
        to?: number;   // Pagination: end index (inclusive)
    }): Promise<any> {
        const requestBody: any = {
            stay: {
                checkIn: params.checkInDate,
                checkOut: params.checkOutDate,
            },
            occupancies: params.occupancies,
        };

        if (params.destinationCode) {
            requestBody.destination = { code: params.destinationCode };
        } else if (params.hotelIds && params.hotelIds.length > 0) {
            requestBody.hotels = { hotel: params.hotelIds };
        } else {
            throw new HttpException('Either destinationCode or hotelIds is required for Hotelbeds search.', HttpStatus.BAD_REQUEST);
        }

        const queryParams: Record<string, string> = {};
        if (params.language) queryParams.language = params.language;
        if (params.from !== undefined) queryParams.from = params.from.toString();
        if (params.to !== undefined) queryParams.to = params.to.toString();

        return this.makeRequest('/hotels', {
            method: 'POST',
            body: requestBody,
            params: queryParams,
        });
    }

    /**
     * Check Rate (Quote & validate before booking)
     * POST /hotel-api/1.0/checkrates
     */
    async checkRates(params: {
        rateKey: string;
        language?: string;
    }): Promise<any> {
        const requestBody: any = {
            rooms: [
                { rateKey: params.rateKey }
            ]
        };

        const queryParams: Record<string, string> = {};
        if (params.language) queryParams.language = params.language;

        return this.makeRequest('/checkrates', {
            method: 'POST',
            body: requestBody,
            params: queryParams,
        });
    }

    /**
     * Create Booking
     * POST /hotel-api/1.0/bookings
     */
    async createBooking(params: {
        clientReference: string;
        holder: {
            name: string;
            surname: string;
        };
        rooms: Array<{
            rateKey: string;
            paxes: Array<{
                roomId: number; // usually 1
                type: 'AD' | 'CH';
                name: string;
                surname: string;
                age?: number; // required if type='CH'
            }>;
        }>;
        paymentData?: {
            paymentCard: {
                cardType: string; // VI, MC, AX
                cardNumber: string;
                cardHolderName: string;
                expiryDate: string; // MM/YY
                cardCVC: string;
            };
            contactData: {
                email: string;
                phoneNumber: string;
            };
        };
        language?: string;
    }): Promise<any> {
        const requestBody: any = {
            holder: params.holder,
            rooms: params.rooms,
            clientReference: params.clientReference,
        };

        if (params.paymentData) {
            requestBody.paymentData = params.paymentData;
        }

        const queryParams: Record<string, string> = {};
        if (params.language) queryParams.language = params.language;

        return this.makeRequest('/bookings', {
            method: 'POST',
            body: requestBody,
            params: queryParams,
        });
    }

    /**
     * Get Booking Details
     * GET /hotel-api/1.0/bookings/{bookingReference}
     */
    async getBooking(bookingReference: string, language?: string): Promise<any> {
        const queryParams: Record<string, string> = {};
        if (language) queryParams.language = language;

        return this.makeRequest(`/bookings/${bookingReference}`, {
            method: 'GET',
            params: queryParams,
        });
    }

    /**
     * Cancel Booking
     * DELETE /hotel-api/1.0/bookings/{bookingReference}
     */
    async cancelBooking(bookingReference: string, cancellationFlag?: 'SIMULATION' | 'CANCELLATION'): Promise<any> {
        const queryParams: Record<string, string> = {};
        if (cancellationFlag) {
            queryParams.cancellationFlag = cancellationFlag;
        }

        return this.makeRequest(`/bookings/${bookingReference}`, {
            method: 'DELETE',
            params: queryParams,
        });
    }
}

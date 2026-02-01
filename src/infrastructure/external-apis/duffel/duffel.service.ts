import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DuffelOfferRequest {
  slices: Array<{
    origin: string; // IATA code (e.g., "LHR")
    destination: string; // IATA code (e.g., "JFK")
    departure_date: string; // ISO 8601 date (e.g., "2024-04-24")
    departure_time?: {
      from?: string; // HH:mm format
      to?: string; // HH:mm format
    };
    arrival_time?: {
      from?: string; // HH:mm format
      to?: string; // HH:mm format
    };
  }>;
  passengers: Array<{
    type?: 'adult' | 'child' | 'infant_without_seat';
    age?: number;
    family_name?: string;
    given_name?: string;
    loyalty_programme_accounts?: Array<{
      airline_iata_code: string;
      account_number: string;
    }>;
    fare_type?: string;
  }>;
  cabin_class?: 'first' | 'business' | 'premium_economy' | 'economy';
  max_connections?: number; // 0 for direct flights, 1 for max 1 connection
  airline_credit_ids?: string[];
  private_fares?: Record<
    string,
    Array<{
      corporate_code?: string;
      tour_code?: string;
      tracking_reference?: string;
    }>
  >;
}

export interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  base_amount: string;
  base_currency: string;
  tax_amount: string | null;
  tax_currency: string | null;
  total_emissions_kg: string | null;
  slices: Array<{
    id: string;
    origin: {
      iata_code: string;
      name: string;
      city_name: string;
      time_zone: string;
    };
    destination: {
      iata_code: string;
      name: string;
      city_name: string;
      time_zone: string;
    };
    duration: string | null; // ISO 8601 duration
    segments: Array<{
      id: string;
      origin: {
        iata_code: string;
        name: string;
        city_name: string;
        time_zone: string;
      };
      destination: {
        iata_code: string;
        name: string;
        city_name: string;
        time_zone: string;
      };
      departing_at: string; // ISO 8601 datetime
      arriving_at: string; // ISO 8601 datetime
      duration: string | null; // ISO 8601 duration
      marketing_carrier: {
        name: string;
        iata_code: string | null;
        logo_symbol_url: string | null;
        logo_lockup_url: string | null;
      };
      operating_carrier: {
        name: string;
        iata_code: string | null;
      };
      marketing_carrier_flight_number: string;
      operating_carrier_flight_number: string | null;
      aircraft: {
        name: string;
        iata_code: string;
      };
    }>;
  }>;
  owner: {
    name: string;
    iata_code: string | null;
    logo_symbol_url: string | null;
    logo_lockup_url: string | null;
  };
  expires_at: string; // ISO 8601 datetime
  payment_requirements: {
    requires_instant_payment: boolean;
    payment_required_by: string | null;
    price_guarantee_expires_at: string | null;
  };
}

export interface DuffelOfferRequestResponse {
  data: {
    id: string;
    slices: Array<{
      origin: {
        iata_code: string;
        name: string;
        city_name: string;
      };
      destination: {
        iata_code: string;
        name: string;
        city_name: string;
      };
      departure_date: string;
    }>;
    offers: DuffelOffer[];
    live_mode: boolean;
    created_at: string;
    cabin_class: string | null;
  };
}

@Injectable()
export class DuffelService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.duffel.com';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DUFFEL_API_KEY') || '';
    if (!this.apiKey) {
      console.warn('⚠️  DUFFEL_API_KEY is not set. Duffel API calls will fail.');
    }
  }

  /**
   * Search for flights using Duffel API
   * Creates an offer request and returns available flight offers
   */
  async searchFlights(
    request: DuffelOfferRequest,
    options?: {
      returnOffers?: boolean; // Default: true
      supplierTimeout?: number; // Default: 20000ms (20 seconds)
    },
  ): Promise<DuffelOfferRequestResponse> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const url = new URL(`${this.baseUrl}/air/offer_requests`);

      // Add query parameters
      if (options?.returnOffers !== undefined) {
        url.searchParams.append('return_offers', String(options.returnOffers));
      }
      if (options?.supplierTimeout !== undefined) {
        url.searchParams.append('supplier_timeout', String(options.supplierTimeout));
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ data: request }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (not Unauthorized)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        // Check for date validation errors (Duffel sometimes returns these incorrectly)
        const isDateValidationError = 
          errorMessage.toLowerCase().includes('departure_date') ||
          errorMessage.toLowerCase().includes('return_date') ||
          errorMessage.toLowerCase().includes('must be after') ||
          errorMessage.toLowerCase().includes('date') && errorMessage.toLowerCase().includes('must');

        if (isDateValidationError && httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
          httpStatus = HttpStatus.BAD_REQUEST;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : isDateValidationError
                  ? 'Invalid date'
                  : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data: DuffelOfferRequestResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to search flights: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List offers for an offer request with pagination
   * This allows fetching offers in pages rather than all at once
   */
  async listOffers(
    offerRequestId: string,
    options?: {
      limit?: number; // 1-200, default 50
      after?: string; // Cursor for next page
      before?: string; // Cursor for previous page
      sort?: string; // e.g., "total_amount", "total_duration"
      max_connections?: number; // Filter by max connections
    },
  ): Promise<{
    data: DuffelOffer[];
    meta: {
      limit: number;
      after: string | null;
      before: string | null;
    };
  }> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const url = new URL(`${this.baseUrl}/air/offers`);

      // Add query parameters
      url.searchParams.append('offer_request_id', offerRequestId);

      if (options?.limit !== undefined) {
        url.searchParams.append('limit', String(Math.min(200, Math.max(1, options.limit))));
      }
      if (options?.after) {
        url.searchParams.append('after', options.after);
      }
      if (options?.before) {
        url.searchParams.append('before', options.before);
      }
      if (options?.sort) {
        url.searchParams.append('sort', options.sort);
      }
      if (options?.max_connections !== undefined) {
        url.searchParams.append('max_connections', String(options.max_connections));
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Duffel API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status === 404
            ? HttpStatus.NOT_FOUND
            : response.status === 401 || response.status === 403
              ? HttpStatus.UNAUTHORIZED
              : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return {
        data: data.data || [],
        meta: data.meta || { limit: 50, after: null, before: null },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to list offers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single offer by ID
   * GET /air/offers/{offer_id}
   */
  async getOffer(offerId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/air/offers/${offerId}`, {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: response.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
          },
          response.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get offer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single offer request by ID
   */
  async getOfferRequest(offerRequestId: string): Promise<DuffelOfferRequestResponse> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/air/offer_requests/${offerRequestId}`, {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Duffel API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status === 404
            ? HttpStatus.NOT_FOUND
            : response.status === 401 || response.status === 403
              ? HttpStatus.UNAUTHORIZED
              : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data: DuffelOfferRequestResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get offer request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a Duffel order from an offer
   * This actually books the flight with the airline
   */
  async createOrder(orderData: {
    selected_offers: string[]; // Array of offer IDs
    passengers: Array<{
      id: string; // Passenger ID from offer
      title?: string; // e.g., "mr", "mrs", "miss"
      gender?: string; // e.g., "m", "f"
      given_name: string;
      family_name: string;
      born_on: string; // YYYY-MM-DD
      email: string;
      phone_number?: string;
      identity_documents?: Array<{
        type: string; // e.g., "passport"
        unique_identifier?: string;
        issued_by?: string;
        expires_on?: string;
      }>;
    }>;
    payments?: Array<{
      type: 'balance' | 'arc_bsp_cash' | 'arc_bsp_cheque' | 'arc_bsp_credit_card' | 'bca' | 'card' | 'cash' | 'cheque' | 'invoice' | 'other';
      amount?: string;
      currency?: string;
    }>;
    metadata?: Record<string, string>;
  }): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/air/orders`, {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ data: orderData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/air/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Duffel API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status === 404
            ? HttpStatus.NOT_FOUND
            : response.status === 401 || response.status === 403
              ? HttpStatus.UNAUTHORIZED
              : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List orders with pagination
   */
  async listOrders(options?: {
    limit?: number;
    after?: string;
    before?: string;
    sort?: string;
  }): Promise<{
    data: any[];
    meta: {
      limit: number;
      after: string | null;
      before: string | null;
    };
  }> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const url = new URL(`${this.baseUrl}/air/orders`);

      if (options?.limit !== undefined) {
        url.searchParams.append('limit', String(Math.min(200, Math.max(1, options.limit))));
      }
      if (options?.after) {
        url.searchParams.append('after', options.after);
      }
      if (options?.before) {
        url.searchParams.append('before', options.before);
      }
      if (options?.sort) {
        url.searchParams.append('sort', options.sort);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Duffel API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return {
        data: data.data || [],
        meta: data.meta || { limit: 50, after: null, before: null },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to list orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a pending order cancellation
   */
  async createOrderCancellation(orderId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/air/order_cancellations`, {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          data: {
            order_id: orderId,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to create order cancellation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Confirm an order cancellation
   */
  async confirmOrderCancellation(cancellationId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/air/order_cancellations/${cancellationId}/actions/confirm`,
        {
          method: 'POST',
          headers: {
            'Accept-Encoding': 'gzip',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Duffel-Version': 'v2',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to confirm order cancellation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List order cancellations with pagination
   */
  async listOrderCancellations(options?: {
    limit?: number;
    after?: string;
    before?: string;
    order_id?: string; // Filter by order ID
  }): Promise<{
    data: any[];
    meta: {
      limit: number;
      after: string | null;
      before: string | null;
    };
  }> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const url = new URL(`${this.baseUrl}/air/order_cancellations`);

      if (options?.limit !== undefined) {
        url.searchParams.append('limit', String(Math.min(200, Math.max(1, options.limit))));
      }
      if (options?.after) {
        url.searchParams.append('after', options.after);
      }
      if (options?.before) {
        url.searchParams.append('before', options.before);
      }
      if (options?.order_id) {
        url.searchParams.append('order_id', options.order_id);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Duffel API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return {
        data: data.data || [],
        meta: data.meta || { limit: 50, after: null, before: null },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to list order cancellations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single order cancellation by ID
   */
  async getOrderCancellation(cancellationId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/air/order_cancellations/${cancellationId}`, {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Duffel API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status === 404
            ? HttpStatus.NOT_FOUND
            : response.status === 401 || response.status === 403
              ? HttpStatus.UNAUTHORIZED
              : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get order cancellation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List airline-initiated changes for an order
   */
  async listAirlineInitiatedChanges(orderId: string): Promise<any[]> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/air/orders/${orderId}/airline_initiated_changes`,
        {
          method: 'GET',
          headers: {
            'Accept-Encoding': 'gzip',
            Accept: 'application/json',
            'Duffel-Version': 'v2',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Duffel API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status === 404
            ? HttpStatus.NOT_FOUND
            : response.status === 401 || response.status === 403
              ? HttpStatus.UNAUTHORIZED
              : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to list airline-initiated changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Accept an airline-initiated change
   */
  async acceptAirlineInitiatedChange(orderId: string, changeId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/air/orders/${orderId}/airline_initiated_changes/${changeId}/actions/accept`,
        {
          method: 'POST',
          headers: {
            'Accept-Encoding': 'gzip',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Duffel-Version': 'v2',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to accept airline-initiated change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update an airline-initiated change
   */
  async updateAirlineInitiatedChange(
    orderId: string,
    changeId: string,
    updateData: {
      selected_order_change_id?: string;
      slices?: {
        remove?: Array<{ slice_id: string }>;
        add?: Array<{
          origin: string;
          destination: string;
          departure_date: string;
          cabin_class?: string;
        }>;
      };
    },
  ): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/air/orders/${orderId}/airline_initiated_changes/${changeId}`,
        {
          method: 'PUT',
          headers: {
            'Accept-Encoding': 'gzip',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Duffel-Version': 'v2',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ data: updateData }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to update airline-initiated change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== HOTEL/STAYS API METHODS ====================

  /**
   * Search for hotels/accommodation
   * POST /stays/search
   */
  async searchHotels(params: {
    location?: {
      geographic_coordinates: {
        latitude: number;
        longitude: number;
      };
      radius?: number; // 1-100 km, default 5
    };
    accommodation?: {
      ids: string[];
      fetch_rates?: boolean;
    };
    check_in_date: string; // ISO 8601 date
    check_out_date: string; // ISO 8601 date
    rooms: number;
    guests: Array<{
      type: 'adult' | 'child';
      age?: number; // Required for child
    }>;
    free_cancellation_only?: boolean;
    mobile?: boolean;
    negotiated_rate_ids?: string[];
  }): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/stays/search`, {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ data: params }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to search hotels: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch rates for a search result
   * POST /stays/search_results/{search_result_id}/actions/fetch_all_rates
   */
  async fetchHotelRates(searchResultId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/stays/search_results/${searchResultId}/actions/fetch_all_rates`,
        {
          method: 'POST',
          headers: {
            'Accept-Encoding': 'gzip',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Duffel-Version': 'v2',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 404
              ? HttpStatus.NOT_FOUND
              : response.status === 400 || response.status === 422
                ? HttpStatus.BAD_REQUEST
                : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to fetch hotel rates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a quote for a rate
   * POST /stays/quotes
   */
  async createHotelQuote(params: {
    rate_id: string;
    search_result_id: string;
    loyalty_programme_account_number?: string;
  }): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/stays/quotes`, {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ data: params }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to create hotel quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a hotel booking
   * POST /stays/bookings
   */
  async createHotelBooking(params: {
    quote_id: string;
    email: string;
    phone_number: string;
    guests: Array<{
      given_name: string;
      family_name: string;
      type: 'adult' | 'child';
      age?: number;
      user_id?: string;
    }>;
    accommodation_special_requests?: string;
    payment?: {
      three_d_secure_session_id?: string;
    };
    metadata?: Record<string, string>;
    users?: string[];
  }): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/stays/bookings`, {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ data: params }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to create hotel booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a hotel booking
   * GET /stays/bookings/{booking_id}
   */
  async getHotelBooking(bookingId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/stays/bookings/${bookingId}`, {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 404
              ? HttpStatus.NOT_FOUND
              : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get hotel booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List hotel bookings
   * GET /stays/bookings
   */
  async listHotelBookings(params?: {
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const url = new URL(`${this.baseUrl}/stays/bookings`);
      if (params?.limit) url.searchParams.append('limit', String(params.limit));
      if (params?.after) url.searchParams.append('after', params.after);
      if (params?.before) url.searchParams.append('before', params.before);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to list hotel bookings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel a hotel booking
   * POST /stays/bookings/{booking_id}/actions/cancel
   */
  async cancelHotelBooking(bookingId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/stays/bookings/${bookingId}/actions/cancel`, {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 404
              ? HttpStatus.NOT_FOUND
              : response.status === 400 || response.status === 422
                ? HttpStatus.BAD_REQUEST
                : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to cancel hotel booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get accommodation details
   * GET /stays/accommodation/{id}
   */
  async getAccommodation(accommodationId: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/stays/accommodation/${accommodationId}`, {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 404
              ? HttpStatus.NOT_FOUND
              : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get accommodation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search for accommodation suggestions (autocomplete)
   * POST /stays/accommodation/suggestions
   */
  async searchAccommodationSuggestions(params: {
    query: string; // Minimum 3 characters
    location?: {
      geographic_coordinates: {
        latitude: number;
        longitude: number;
      };
      radius?: number; // 1-100 km, default 5
    };
  }): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(`${this.baseUrl}/stays/accommodation/suggestions`, {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ data: params }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to search accommodation suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get accommodation reviews
   * GET /stays/accommodation/{id}/reviews
   */
  async getAccommodationReviews(
    accommodationId: string,
    params?: {
      limit?: number;
      after?: string;
      before?: string;
    },
  ): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const url = new URL(`${this.baseUrl}/stays/accommodation/${accommodationId}/reviews`);
      if (params?.limit) url.searchParams.append('limit', String(params.limit));
      if (params?.after) url.searchParams.append('after', params.after);
      if (params?.before) url.searchParams.append('before', params.before);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 404
              ? HttpStatus.NOT_FOUND
              : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get accommodation reviews: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search for place suggestions (airports/cities) - for flight search autocomplete
   * GET /places/suggestions
   */
  async searchPlaceSuggestions(params: {
    query: string; // Search string for airport/city name or IATA code
    lat?: string; // Latitude for location-based search
    lng?: string; // Longitude for location-based search
    rad?: string; // Radius in metres for location-based search
  }): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const url = new URL(`${this.baseUrl}/places/suggestions`);
      url.searchParams.append('query', params.query);
      if (params.lat) url.searchParams.append('lat', params.lat);
      if (params.lng) url.searchParams.append('lng', params.lng);
      if (params.rad) url.searchParams.append('rad', params.rad);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes properly
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 403) {
          httpStatus = HttpStatus.FORBIDDEN; // 403 = Forbidden (feature not enabled)
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
          },
          httpStatus,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to search place suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List airlines
   * GET /air/airlines
   */
  async listAirlines(params?: {
    limit?: number; // 1-200, default 50
    after?: string; // Cursor for pagination
    before?: string; // Cursor for pagination
  }): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Duffel API key is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const url = new URL(`${this.baseUrl}/air/airlines`);
      if (params?.limit) url.searchParams.append('limit', String(Math.min(Math.max(params.limit, 1), 200)));
      if (params?.after) url.searchParams.append('after', params.after);
      if (params?.before) url.searchParams.append('before', params.before);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/json',
          'Duffel-Version': 'v2',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Duffel API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors.map((e: any) => e.message || e.detail).join(', ');
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to list airlines: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

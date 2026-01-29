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

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 400
              ? HttpStatus.BAD_REQUEST
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

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 400 || response.status === 422
              ? HttpStatus.BAD_REQUEST
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

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 400 || response.status === 422
              ? HttpStatus.BAD_REQUEST
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

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 400 || response.status === 422
              ? HttpStatus.BAD_REQUEST
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

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 400 || response.status === 422
              ? HttpStatus.BAD_REQUEST
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

        throw new HttpException(
          errorMessage,
          response.status === 401 || response.status === 403
            ? HttpStatus.UNAUTHORIZED
            : response.status === 400 || response.status === 422
              ? HttpStatus.BAD_REQUEST
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
        `Failed to update airline-initiated change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

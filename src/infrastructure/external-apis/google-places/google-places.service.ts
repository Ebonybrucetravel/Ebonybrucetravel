import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  price_level?: number;
  types?: string[];
}

export interface PlacePhoto {
  photo_reference: string;
  max_width?: number;
  max_height?: number;
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('Google Places API key not configured. Hotel image features will not work.');
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  /**
   * Get place details by place ID
   * Cost: $0.017 (Basic) or $0.032 (Advanced) per request
   */
  async getPlaceDetails(placeId: string, fields?: string[]): Promise<PlaceDetails> {
    if (!this.isConfigured()) {
      throw new HttpException(
        'Google Places API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      // Default fields for hotel details
      const defaultFields = [
        'place_id',
        'name',
        'formatted_address',
        'formatted_phone_number',
        'website',
        'rating',
        'user_ratings_total',
        'photos',
        'geometry',
        'opening_hours',
        'price_level',
        'types',
      ];

      const fieldsParam = fields?.join(',') || defaultFields.join(',');

      const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=${fieldsParam}&key=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new HttpException(
          `Google Places API error: ${response.status}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new HttpException(
          `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (data.status === 'ZERO_RESULTS' || !data.result) {
        throw new HttpException('Place not found', HttpStatus.NOT_FOUND);
      }

      return data.result as PlaceDetails;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error fetching place details:', error);
      throw new HttpException(
        'Failed to fetch place details from Google Places API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search for places by text query
   * Cost: $0.032 per request
   */
  async searchPlaces(query: string, location?: { lat: number; lng: number }): Promise<any> {
    if (!this.isConfigured()) {
      throw new HttpException(
        'Google Places API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      let url = `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;

      if (location) {
        url += `&location=${location.lat},${location.lng}&radius=5000`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new HttpException(
          `Google Places API error: ${response.status}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new HttpException(
          `Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return data.results || [];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error searching places:', error);
      throw new HttpException(
        'Failed to search places from Google Places API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get photo URL from photo reference
   * Cost: $0.005 per photo
   * Note: Returns the URL, actual image fetch should be done server-side
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 800, maxHeight?: number): string {
    if (!this.isConfigured()) {
      throw new HttpException(
        'Google Places API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let url = `${this.baseUrl}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey}`;
    if (maxHeight) {
      url += `&maxheight=${maxHeight}`;
    }

    return url;
  }

  /**
   * Fetch actual image from Google Photos API
   * Cost: $0.005 per photo
   */
  async fetchPhoto(photoReference: string, maxWidth: number = 800): Promise<Buffer> {
    const photoUrl = this.getPhotoUrl(photoReference, maxWidth);

    try {
      const response = await fetch(photoUrl);

      if (!response.ok) {
        throw new HttpException(
          `Failed to fetch photo: ${response.status}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error fetching photo:', error);
      throw new HttpException('Failed to fetch photo from Google Places API', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


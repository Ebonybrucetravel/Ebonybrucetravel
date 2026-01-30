import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { AccommodationSuggestionsDto } from '@presentation/booking/dto/accommodation-suggestions.dto';

@Injectable()
export class SearchAccommodationSuggestionsUseCase {
  constructor(private readonly duffelService: DuffelService) {}

  async execute(dto: AccommodationSuggestionsDto) {
    try {
      const params: any = {
        query: dto.query,
      };

      if (dto.location) {
        params.location = {
          geographic_coordinates: dto.location.geographic_coordinates,
          ...(dto.location.radius && { radius: dto.location.radius }),
        };
      }

      const response = await this.duffelService.searchAccommodationSuggestions(params);
      return response.data;
    } catch (error) {
      console.error('Error searching accommodation suggestions:', error);
      throw error;
    }
  }
}


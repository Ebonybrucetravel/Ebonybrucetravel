import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { PlaceSuggestionsDto } from '@presentation/booking/dto/place-suggestions.dto';

@Injectable()
export class SearchPlaceSuggestionsUseCase {
  constructor(private readonly duffelService: DuffelService) {}

  async execute(dto: PlaceSuggestionsDto) {
    try {
      const params: any = {
        query: dto.query,
      };

      if (dto.lat !== undefined) {
        params.lat = String(dto.lat);
      }
      if (dto.lng !== undefined) {
        params.lng = String(dto.lng);
      }
      if (dto.rad !== undefined) {
        params.rad = String(dto.rad);
      }

      const response = await this.duffelService.searchPlaceSuggestions(params);
      return response.data;
    } catch (error) {
      console.error('Error searching place suggestions:', error);
      throw error;
    }
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { AccommodationSuggestionsDto } from '@presentation/booking/dto/accommodation-suggestions.dto';

@Injectable()
export class SearchAccommodationSuggestionsUseCase {
  private readonly logger = new Logger(SearchAccommodationSuggestionsUseCase.name);

  constructor(private readonly amadeusService: AmadeusService) {}

  async execute(dto: AccommodationSuggestionsDto) {
    try {
      const response = await this.amadeusService.searchHotelNames({
        keyword: dto.keyword,
        ...(dto.subType && { subType: dto.subType }),
        ...(dto.countryCode && { countryCode: dto.countryCode }),
        page: {
          limit: 20,
          offset: 0,
        },
      });

      // Amadeus returns { data: [{ type: 'hotel', hotelId: '...', name: '...', ... }] }
      return {
        success: true,
        data: response.data || [],
        message: 'Hotel suggestions retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error searching hotel suggestions:', error);
      throw error;
    }
  }
}


import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { CreateHotelQuoteDto } from '@presentation/booking/dto/create-hotel-quote.dto';

@Injectable()
export class CreateHotelQuoteUseCase {
  constructor(private readonly duffelService: DuffelService) {}

  async execute(dto: CreateHotelQuoteDto) {
    try {
      const response = await this.duffelService.createHotelQuote({
        rate_id: dto.rate_id,
        search_result_id: dto.search_result_id,
        ...(dto.loyalty_programme_account_number && {
          loyalty_programme_account_number: dto.loyalty_programme_account_number,
        }),
      });

      return response.data;
    } catch (error) {
      console.error('Error creating hotel quote:', error);
      throw error;
    }
  }
}


import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';

@Injectable()
export class GetAccommodationUseCase {
  constructor(private readonly duffelService: DuffelService) {}

  async execute(accommodationId: string) {
    try {
      const response = await this.duffelService.getAccommodation(accommodationId);
      return response.data;
    } catch (error) {
      console.error('Error getting accommodation:', error);
      throw error;
    }
  }
}


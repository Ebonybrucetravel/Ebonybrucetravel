import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';

@Injectable()
export class GetAccommodationReviewsUseCase {
  constructor(private readonly duffelService: DuffelService) {}

  async execute(
    accommodationId: string,
    pagination?: { limit?: number; after?: string; before?: string },
  ) {
    try {
      const response = await this.duffelService.getAccommodationReviews(accommodationId, pagination);
      return response.data;
    } catch (error) {
      console.error('Error getting accommodation reviews:', error);
      throw error;
    }
  }
}


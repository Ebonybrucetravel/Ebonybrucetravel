import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';

@Injectable()
export class ListAirlinesUseCase {
  constructor(private readonly duffelService: DuffelService) {}

  async execute(pagination?: { limit?: number; after?: string; before?: string }) {
    try {
      const response = await this.duffelService.listAirlines(pagination);
      return {
        data: response.data,
        meta: response.meta,
      };
    } catch (error) {
      console.error('Error listing airlines:', error);
      throw error;
    }
  }
}


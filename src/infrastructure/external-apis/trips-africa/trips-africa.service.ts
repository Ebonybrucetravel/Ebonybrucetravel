import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class TripsAfricaService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TRIPS_AFRICA_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('TRIPS_AFRICA_BASE_URL') || '';
  }
}

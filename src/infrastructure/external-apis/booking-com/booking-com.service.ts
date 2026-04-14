import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class BookingComService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BOOKING_COM_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('BOOKING_COM_BASE_URL') || '';
  }
}

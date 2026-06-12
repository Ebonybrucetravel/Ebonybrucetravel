import { Module } from '@nestjs/common';
import { AmadeusService } from './amadeus.service';
import { ConfigModule } from '@nestjs/config';
import { CurrencyService } from '@infrastructure/currency/currency.service';

@Module({
  imports: [ConfigModule],
  providers: [AmadeusService, CurrencyService],
  exports: [AmadeusService],
})
export class AmadeusModule {}
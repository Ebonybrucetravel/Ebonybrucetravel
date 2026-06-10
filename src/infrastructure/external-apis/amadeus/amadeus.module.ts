import { Module } from '@nestjs/common';
import { AmadeusService } from './amadeus.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [AmadeusService],
  exports: [AmadeusService],
})
export class AmadeusModule {}

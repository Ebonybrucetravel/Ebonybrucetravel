import { Module } from '@nestjs/common';
import { SavedTravelersService } from './saved-travelers.service';
import { DatabaseModule } from '@infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SavedTravelersService],
  exports: [SavedTravelersService],
})
export class SavedTravelersModule {}


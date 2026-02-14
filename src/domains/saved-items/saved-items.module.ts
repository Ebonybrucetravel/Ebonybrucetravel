import { Module } from '@nestjs/common';
import { SavedItemsService } from './saved-items.service';
import { DatabaseModule } from '@infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SavedItemsService],
  exports: [SavedItemsService],
})
export class SavedItemsModule {}


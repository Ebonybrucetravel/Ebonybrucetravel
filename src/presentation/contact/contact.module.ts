import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { DatabaseModule } from '@infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ContactController],
})
export class ContactModule {}

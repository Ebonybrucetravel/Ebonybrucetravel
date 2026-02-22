import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { EmailModule } from '@infrastructure/email/email.module';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [ContactController],
})
export class ContactModule {}

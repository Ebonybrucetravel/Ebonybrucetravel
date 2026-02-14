import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { AgencyCardService } from './agency-card.service';

@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, AgencyCardService],
  exports: [EncryptionService, AgencyCardService],
})
export class SecurityModule {}


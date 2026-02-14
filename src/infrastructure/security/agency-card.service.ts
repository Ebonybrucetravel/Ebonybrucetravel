import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

export interface AmadeusAgencyCard {
  vendorCode: string;
  cardNumber: string;
  expiryDate: string;
  holderName?: string;
  securityCode?: string;
}

/**
 * Provides the agency/merchant card for paying Amadeus (hotels, car rentals) when
 * PAYMENT_MODEL=merchant. Card is stored encrypted in env (AMADEUS_AGENCY_CARD_ENCRYPTED).
 * Never log or expose card details.
 */
@Injectable()
export class AgencyCardService {
  private readonly logger = new Logger(AgencyCardService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /** True when PAYMENT_MODEL=merchant (customer pays Stripe only; we pay Amadeus with agency card). */
  isMerchantModel(): boolean {
    const model = this.configService.get<string>('PAYMENT_MODEL')?.toLowerCase();
    return model === 'merchant';
  }

  /**
   * Returns decrypted Amadeus agency card when merchant model is enabled and card is configured.
   * Returns null otherwise. Never log the returned value.
   */
  getAmadeusAgencyCard(): AmadeusAgencyCard | null {
    if (!this.isMerchantModel()) {
      return null;
    }
    const encrypted = this.configService.get<string>('AMADEUS_AGENCY_CARD_ENCRYPTED');
    if (!encrypted?.trim()) {
      this.logger.warn('PAYMENT_MODEL=merchant but AMADEUS_AGENCY_CARD_ENCRYPTED is not set');
      return null;
    }
    try {
      const card = this.encryptionService.decryptCardDetails(encrypted);
      return {
        vendorCode: card.vendorCode,
        cardNumber: card.cardNumber,
        expiryDate: card.expiryDate,
        holderName: card.holderName,
        securityCode: card.securityCode,
      };
    } catch (error) {
      this.logger.error('Failed to decrypt agency card (check AMADEUS_AGENCY_CARD_ENCRYPTED and ENCRYPTION_KEY)');
      return null;
    }
  }
}

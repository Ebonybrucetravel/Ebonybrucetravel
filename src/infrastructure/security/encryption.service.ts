import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encryption service for securely storing sensitive data (like card details)
 * 
 * Note: In production, use a proper key management service (AWS KMS, HashiCorp Vault, etc.)
 * This is a basic implementation using AES-256-GCM encryption.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    // Get encryption key from environment (32 bytes for AES-256)
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    
    if (!encryptionKey) {
      this.logger.warn(
        'ENCRYPTION_KEY not set. Using a default key (NOT SECURE FOR PRODUCTION). ' +
          'Please set ENCRYPTION_KEY environment variable with a 32-byte key.',
      );
      // Default key for development (DO NOT USE IN PRODUCTION)
      this.key = crypto.scryptSync('default-key-change-in-production', 'salt', 32);
    } else {
      // Convert hex string to buffer, or use scrypt if it's a password
      if (encryptionKey.length === 64) {
        // Assume hex-encoded 32-byte key
        this.key = Buffer.from(encryptionKey, 'hex');
      } else {
        // Derive key from password
        this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
      }
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16); // Initialization vector
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return: iv:authTag:encrypted (all hex-encoded)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt card details object
   */
  encryptCardDetails(cardDetails: {
    vendorCode: string;
    cardNumber: string;
    expiryDate: string;
    holderName?: string;
    securityCode?: string;
  }): string {
    const cardData = JSON.stringify(cardDetails);
    return this.encrypt(cardData);
  }

  /**
   * Decrypt card details object
   */
  decryptCardDetails(encryptedCardData: string): {
    vendorCode: string;
    cardNumber: string;
    expiryDate: string;
    holderName?: string;
    securityCode?: string;
  } {
    const decrypted = this.decrypt(encryptedCardData);
    return JSON.parse(decrypted);
  }
}


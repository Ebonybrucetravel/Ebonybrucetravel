import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface CreateSavedTravelerDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string; // ISO date string
  gender?: string;
  relationship?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportExpiry?: string; // ISO date string
  nationalId?: string;
  frequentFlyerNumber?: string;
  frequentFlyerAirline?: string;
  isDefault?: boolean;
}

export interface UpdateSavedTravelerDto extends Partial<CreateSavedTravelerDto> {}

@Injectable()
export class SavedTravelersService {
  private readonly logger = new Logger(SavedTravelersService.name);
  private readonly MAX_SAVED_TRAVELERS = 10; // Business limit per user

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add a new saved traveler
   */
  async addTraveler(userId: string, dto: CreateSavedTravelerDto) {
    // Check max limit
    const existingCount = await this.prisma.savedTraveler.count({
      where: { userId, deletedAt: null },
    });

    if (existingCount >= this.MAX_SAVED_TRAVELERS) {
      throw new BadRequestException(
        `Maximum of ${this.MAX_SAVED_TRAVELERS} saved travelers allowed. Please remove a traveler first.`,
      );
    }

    // If setting as default, unset previous default
    if (dto.isDefault) {
      await this.prisma.savedTraveler.updateMany({
        where: { userId, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If first traveler, auto-set as default
    const isDefault = existingCount === 0 ? true : (dto.isDefault || false);

    const traveler = await this.prisma.savedTraveler.create({
      data: {
        userId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email?.trim(),
        phone: dto.phone?.trim(),
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        relationship: dto.relationship,
        passportNumber: dto.passportNumber?.trim(),
        passportCountry: dto.passportCountry?.toUpperCase().trim(),
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
        nationalId: dto.nationalId?.trim(),
        frequentFlyerNumber: dto.frequentFlyerNumber?.trim(),
        frequentFlyerAirline: dto.frequentFlyerAirline?.toUpperCase().trim(),
        isDefault,
      },
    });

    this.logger.log(
      `User ${userId} added traveler: ${dto.firstName} ${dto.lastName} (${dto.relationship || 'N/A'})`,
    );

    return this.formatTraveler(traveler);
  }

  /**
   * List all saved travelers for a user
   */
  async listTravelers(userId: string) {
    const travelers = await this.prisma.savedTraveler.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      data: travelers.map((t) => this.formatTraveler(t)),
      meta: {
        total: travelers.length,
        maxAllowed: this.MAX_SAVED_TRAVELERS,
        remaining: this.MAX_SAVED_TRAVELERS - travelers.length,
      },
    };
  }

  /**
   * Get a specific traveler
   */
  async getTraveler(userId: string, travelerId: string) {
    const traveler = await this.prisma.savedTraveler.findFirst({
      where: { id: travelerId, userId, deletedAt: null },
    });

    if (!traveler) {
      throw new NotFoundException('Traveler not found');
    }

    return this.formatTraveler(traveler);
  }

  /**
   * Update a saved traveler
   */
  async updateTraveler(userId: string, travelerId: string, dto: UpdateSavedTravelerDto) {
    const traveler = await this.prisma.savedTraveler.findFirst({
      where: { id: travelerId, userId, deletedAt: null },
    });

    if (!traveler) {
      throw new NotFoundException('Traveler not found');
    }

    // If setting as default, unset previous default
    if (dto.isDefault) {
      await this.prisma.savedTraveler.updateMany({
        where: { userId, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.savedTraveler.update({
      where: { id: travelerId },
      data: {
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        email: dto.email?.trim(),
        phone: dto.phone?.trim(),
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        relationship: dto.relationship,
        passportNumber: dto.passportNumber?.trim(),
        passportCountry: dto.passportCountry?.toUpperCase().trim(),
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
        nationalId: dto.nationalId?.trim(),
        frequentFlyerNumber: dto.frequentFlyerNumber?.trim(),
        frequentFlyerAirline: dto.frequentFlyerAirline?.toUpperCase().trim(),
        isDefault: dto.isDefault,
      },
    });

    return this.formatTraveler(updated);
  }

  /**
   * Remove a saved traveler (soft delete)
   */
  async removeTraveler(userId: string, travelerId: string) {
    const traveler = await this.prisma.savedTraveler.findFirst({
      where: { id: travelerId, userId, deletedAt: null },
    });

    if (!traveler) {
      throw new NotFoundException('Traveler not found');
    }

    await this.prisma.savedTraveler.update({
      where: { id: travelerId },
      data: { deletedAt: new Date() },
    });

    // If removed traveler was default, set next available as default
    if (traveler.isDefault) {
      const next = await this.prisma.savedTraveler.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });

      if (next) {
        await this.prisma.savedTraveler.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true, message: 'Traveler removed' };
  }

  /**
   * Get travelers by IDs for checkout (batch fetch)
   * Used when user selects travelers at booking time
   */
  async getTravelersByIds(userId: string, travelerIds: string[]) {
    const travelers = await this.prisma.savedTraveler.findMany({
      where: {
        id: { in: travelerIds },
        userId,
        deletedAt: null,
      },
    });

    if (travelers.length !== travelerIds.length) {
      const foundIds = travelers.map((t) => t.id);
      const missingIds = travelerIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Travelers not found: ${missingIds.join(', ')}`,
      );
    }

    return travelers.map((t) => this.formatTravelerForBooking(t));
  }

  /**
   * Format traveler for API response (safe display)
   */
  private formatTraveler(traveler: any) {
    return {
      id: traveler.id,
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      fullName: `${traveler.firstName} ${traveler.lastName}`,
      email: traveler.email,
      phone: traveler.phone,
      dateOfBirth: traveler.dateOfBirth,
      gender: traveler.gender,
      relationship: traveler.relationship,
      // Mask sensitive data
      passportNumber: traveler.passportNumber
        ? `****${traveler.passportNumber.slice(-4)}`
        : null,
      passportCountry: traveler.passportCountry,
      passportExpiry: traveler.passportExpiry,
      nationalId: traveler.nationalId
        ? `****${traveler.nationalId.slice(-4)}`
        : null,
      frequentFlyerNumber: traveler.frequentFlyerNumber,
      frequentFlyerAirline: traveler.frequentFlyerAirline,
      isDefault: traveler.isDefault,
      createdAt: traveler.createdAt,
      updatedAt: traveler.updatedAt,
    };
  }

  /**
   * Format traveler for booking/checkout (includes unmasked data needed for booking)
   */
  private formatTravelerForBooking(traveler: any) {
    return {
      id: traveler.id,
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      email: traveler.email,
      phone: traveler.phone,
      dateOfBirth: traveler.dateOfBirth,
      gender: traveler.gender,
      passportNumber: traveler.passportNumber,
      passportCountry: traveler.passportCountry,
      passportExpiry: traveler.passportExpiry,
      nationalId: traveler.nationalId,
      frequentFlyerNumber: traveler.frequentFlyerNumber,
      frequentFlyerAirline: traveler.frequentFlyerAirline,
    };
  }
}


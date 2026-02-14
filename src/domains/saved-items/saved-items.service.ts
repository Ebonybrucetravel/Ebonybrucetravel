import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ProductType, Provider } from '@prisma/client';

export interface SaveItemDto {
  productType: ProductType;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  rating?: number;
  providerId?: string;
  provider?: Provider;
  itemData?: any;
  location?: string;
  notes?: string;
}

@Injectable()
export class SavedItemsService {
  private readonly logger = new Logger(SavedItemsService.name);
  private readonly MAX_SAVED_ITEMS = 50; // Max items per user

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save an item to user's wishlist
   */
  async saveItem(userId: string, dto: SaveItemDto) {
    // Check max limit
    const existingCount = await this.prisma.savedItem.count({
      where: { userId },
    });

    if (existingCount >= this.MAX_SAVED_ITEMS) {
      throw new BadRequestException(
        `Maximum of ${this.MAX_SAVED_ITEMS} saved items allowed. Please remove some items first.`,
      );
    }

    // Check for duplicate (same product type + provider ID)
    if (dto.providerId) {
      const existing = await this.prisma.savedItem.findUnique({
        where: {
          userId_productType_providerId: {
            userId,
            productType: dto.productType,
            providerId: dto.providerId,
          },
        },
      });

      if (existing) {
        throw new ConflictException('This item is already saved to your wishlist');
      }
    }

    const savedItem = await this.prisma.savedItem.create({
      data: {
        userId,
        productType: dto.productType,
        title: dto.title,
        subtitle: dto.subtitle,
        imageUrl: dto.imageUrl,
        price: dto.price,
        currency: dto.currency,
        rating: dto.rating,
        providerId: dto.providerId,
        provider: dto.provider,
        itemData: dto.itemData || undefined,
        location: dto.location,
        notes: dto.notes,
      },
    });

    this.logger.log(`User ${userId} saved item: ${dto.title} (${dto.productType})`);
    return this.formatItem(savedItem);
  }

  /**
   * Get all saved items for a user with optional filtering
   */
  async getSavedItems(
    userId: string,
    options?: {
      productType?: ProductType;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options?.productType) {
      where.productType = options.productType;
    }

    const [items, total] = await Promise.all([
      this.prisma.savedItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.savedItem.count({ where }),
    ]);

    return {
      data: items.map((item) => this.formatItem(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a specific saved item
   */
  async getSavedItem(userId: string, itemId: string) {
    const item = await this.prisma.savedItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Saved item not found');
    }

    return this.formatItem(item);
  }

  /**
   * Update notes on a saved item
   */
  async updateNotes(userId: string, itemId: string, notes: string) {
    const item = await this.prisma.savedItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Saved item not found');
    }

    const updated = await this.prisma.savedItem.update({
      where: { id: itemId },
      data: { notes },
    });

    return this.formatItem(updated);
  }

  /**
   * Remove an item from wishlist
   */
  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.savedItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Saved item not found');
    }

    await this.prisma.savedItem.delete({
      where: { id: itemId },
    });

    return { success: true, message: 'Item removed from wishlist' };
  }

  /**
   * Check if an item is saved (for UI toggle)
   */
  async isItemSaved(
    userId: string,
    productType: ProductType,
    providerId: string,
  ): Promise<boolean> {
    const item = await this.prisma.savedItem.findUnique({
      where: {
        userId_productType_providerId: {
          userId,
          productType,
          providerId,
        },
      },
      select: { id: true },
    });

    return !!item;
  }

  /**
   * Toggle save/unsave an item
   */
  async toggleSave(userId: string, dto: SaveItemDto) {
    if (!dto.providerId) {
      throw new BadRequestException('providerId is required for toggle');
    }

    const existing = await this.prisma.savedItem.findUnique({
      where: {
        userId_productType_providerId: {
          userId,
          productType: dto.productType,
          providerId: dto.providerId,
        },
      },
    });

    if (existing) {
      await this.prisma.savedItem.delete({ where: { id: existing.id } });
      return { saved: false, message: 'Item removed from wishlist' };
    } else {
      const item = await this.saveItem(userId, dto);
      return { saved: true, message: 'Item saved to wishlist', item };
    }
  }

  /**
   * Get saved items count per product type
   */
  async getSavedItemsCounts(userId: string) {
    const counts = await this.prisma.savedItem.groupBy({
      by: ['productType'],
      where: { userId },
      _count: { id: true },
    });

    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.productType] = c._count.id;
    }

    return {
      total: Object.values(result).reduce((a, b) => a + b, 0),
      byType: result,
    };
  }

  private formatItem(item: any) {
    return {
      id: item.id,
      productType: item.productType,
      title: item.title,
      subtitle: item.subtitle,
      imageUrl: item.imageUrl,
      price: item.price ? Number(item.price) : null,
      currency: item.currency,
      rating: item.rating ? Number(item.rating) : null,
      providerId: item.providerId,
      provider: item.provider,
      location: item.location,
      notes: item.notes,
      itemData: item.itemData,
      createdAt: item.createdAt,
    };
  }
}


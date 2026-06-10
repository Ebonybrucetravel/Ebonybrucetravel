import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GooglePlacesService } from '@infrastructure/external-apis/google-places/google-places.service';
import { CloudinaryService } from '@infrastructure/cloudinary/cloudinary.service';
import { UsageTrackingService } from '@infrastructure/usage-tracking/usage-tracking.service';
import { ImageFallbackService } from '@infrastructure/external-apis/image-fallback/image-fallback.service';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';

export interface HotelImageResult {
  hotelId: string;
  hotelName: string;
  images: Array<{
    url: string;
    type: string;
    source: string;
    attribution?: string;
  }>;
  details?: {
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    totalReviews?: number;
  };
  cached: boolean;
  attribution?: string;
  message?: string;
  fallbackUsed?: boolean;
}

@Injectable()
export class HotelImageCacheService {
  private readonly logger = new Logger(HotelImageCacheService.name);
  private readonly CACHE_DURATION_DAYS = 60;

  constructor(
    private prisma: PrismaService,
    private amadeusService: AmadeusService,
    private googlePlacesService: GooglePlacesService,
    private cloudinaryService: CloudinaryService,
    private usageTracking: UsageTrackingService,
    private imageFallbackService: ImageFallbackService,
  ) {}

  async getHotelImages(
    hotelId: string,
    hotelName: string,
    googlePlaceId?: string,
  ): Promise<HotelImageResult> {
    // Step 1: Check cache first
    const cachedImages = await this.prisma.hotelImage.findMany({
      where: {
        hotelId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cachedImages.length > 0) {
      this.logger.log(`Cache hit for hotel ${hotelId}`);
      return {
        hotelId,
        hotelName: cachedImages[0].hotelName || hotelName,
        images: cachedImages.map((img) => ({
          url: img.imageUrl,
          type: img.imageType || 'unknown',
          source: img.source,
        })),
        cached: true,
      };
    }

    // Step 2: Try Amadeus Content API first
    const amadeusResult = await this.fetchFromAmadeus(hotelId, hotelName);
    if (amadeusResult && amadeusResult.images.length > 0) {
      this.logger.log(`✅ Amadeus images found for hotel ${hotelId}`);
      return amadeusResult;
    }

    // Step 3: Try Google Places as fallback
    const googlePlacesAvailable = await this.isGooglePlacesAvailable();
    if (googlePlacesAvailable) {
      try {
        const isLimitReached = await this.usageTracking.isLimitReached('google_places', 'requests');
        if (!isLimitReached) {
          const result = await this.fetchFromGooglePlaces(hotelId, hotelName, googlePlaceId);
          if (result && result.images.length > 0) {
            return result;
          }
        }
      } catch (error) {
        this.logger.warn(`Google Places failed for hotel ${hotelId}: ${error.message}`);
      }
    }

    // Step 4: Fallback to generic images
    return await this.getFallbackImages(hotelId, hotelName);
  }

  private async fetchFromAmadeus(
    hotelId: string,
    hotelName: string,
  ): Promise<HotelImageResult | null> {
    try {
      this.logger.log(`Fetching images from Amadeus for hotel: ${hotelId}`);

      const primaryImageUrl = await this.amadeusService.getHotelPrimaryImageUrl(hotelId);

      if (!primaryImageUrl) {
        this.logger.warn(`No Amadeus images found for hotel ${hotelId}`);
        return null;
      }

      this.logger.log(`✅ Found Amadeus image for hotel ${hotelId}`);

      const cloudinaryResult = await this.cloudinaryService.uploadImage(
        primaryImageUrl,
        'ebony-bruce-travels/hotels',
        `hotel_${hotelId}_amadeus`,
      );

      await this.prisma.hotelImage.create({
        data: {
          hotelId,
          hotelName,
          imageUrl: cloudinaryResult.url,
          imageType: 'exterior',
          publicId: cloudinaryResult.publicId,
          source: 'amadeus',
          expiresAt: new Date(Date.now() + this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      const estimatedSizeGB = 0.0002;
      await this.usageTracking.incrementUsage('cloudinary', 'storage_gb', estimatedSizeGB);

      return {
        hotelId,
        hotelName,
        images: [
          {
            url: cloudinaryResult.url,
            type: 'exterior',
            source: 'amadeus',
            attribution: 'Image provided by Amadeus',
          },
        ],
        cached: false,
        message: 'Hotel image retrieved from Amadeus',
      };
    } catch (error) {
      this.logger.error(`Amadeus fetch failed for hotel ${hotelId}:`, error);
      return null;
    }
  }

  private async fetchFromGooglePlaces(
    hotelId: string,
    hotelName: string,
    googlePlaceId?: string,
  ): Promise<HotelImageResult | null> {
    try {
      let placeId = googlePlaceId;
      if (!placeId) {
        const searchResults = await this.googlePlacesService.searchPlaces(hotelName);
        if (searchResults.length === 0) {
          this.logger.warn(`Hotel "${hotelName}" not found in Google Places`);
          return null;
        }
        placeId = searchResults[0].place_id;
      }

      const placeDetails = await this.googlePlacesService.getPlaceDetails(placeId);
      await this.usageTracking.incrementUsage('google_places', 'requests', 1);

      const images: Array<{ url: string; type: string; source: string; attribution?: string }> = [];
      const photos = placeDetails.photos?.slice(0, 5) || [];

      if (photos.length === 0) {
        this.logger.warn(`No photos found in Google Places for hotel ${hotelId}`);
        return null;
      }

      for (let i = 0; i < photos.length; i++) {
        try {
          const cloudinaryLimitReached = await this.usageTracking.isLimitReached(
            'cloudinary',
            'storage_gb',
          );

          if (cloudinaryLimitReached) {
            this.logger.warn(`Cloudinary storage limit reached, stopping photo uploads`);
            break;
          }

          const photoBuffer = await this.googlePlacesService.fetchPhoto(
            photos[i].photo_reference,
            800,
          );

          await this.usageTracking.incrementUsage('google_places', 'requests', 1);

          const cloudinaryResult = await this.cloudinaryService.uploadImage(
            photoBuffer as Buffer,
            'ebony-bruce-travels/hotels',
            `hotel_${hotelId}_google_${i}`,
          );

          const imageType = this.determineImageType(i, photos.length);

          await this.prisma.hotelImage.create({
            data: {
              hotelId,
              hotelName: placeDetails.name || hotelName,
              imageUrl: cloudinaryResult.url,
              imageType: imageType,
              publicId: cloudinaryResult.publicId,
              source: 'google_places',
              expiresAt: new Date(Date.now() + this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000),
            },
          });

          images.push({
            url: cloudinaryResult.url,
            type: imageType,
            source: 'google_places',
            attribution: 'Photo from Google Places',
          });

          const estimatedSizeGB = 0.0002;
          await this.usageTracking.incrementUsage('cloudinary', 'storage_gb', estimatedSizeGB);
        } catch (error) {
          this.logger.error(`Error processing Google photo ${i + 1} for hotel ${hotelId}:`, error);
        }
      }

      if (images.length > 0) {
        return {
          hotelId,
          hotelName: placeDetails.name || hotelName,
          images,
          details: {
            address: placeDetails.formatted_address,
            phone: placeDetails.formatted_phone_number,
            website: placeDetails.website,
            rating: placeDetails.rating,
            totalReviews: placeDetails.user_ratings_total,
          },
          cached: false,
          attribution: 'Powered by Google',
          message: 'Hotel images retrieved from Google Places',
        };
      }
    } catch (error) {
      this.logger.error(`Google Places fetch failed for hotel ${hotelId}:`, error);
    }
    return null;
  }

  private async getFallbackImages(
    hotelId: string,
    hotelName: string,
  ): Promise<HotelImageResult> {
    try {
      const fallbackImages = await this.imageFallbackService.getFallbackImages(hotelName, 5);

      return {
        hotelId,
        hotelName,
        images: fallbackImages.map((img) => ({
          url: img.url,
          type: img.type,
          source: img.source,
          attribution: img.attribution,
        })),
        cached: false,
        fallbackUsed: true,
        message: 'Hotel-specific images are currently unavailable. Showing generic hotel images for reference.',
      };
    } catch (error) {
      this.logger.error(`Error getting fallback images for hotel ${hotelId}:`, error);
      return {
        hotelId,
        hotelName,
        images: [],
        cached: false,
        fallbackUsed: true,
        message: 'Images are temporarily unavailable. Please check back later.',
      };
    }
  }

  async getPrimaryImageUrls(hotelIds: string[]): Promise<Record<string, string>> {
    if (!hotelIds.length) return {};
    const now = new Date();
    const rows = await this.prisma.hotelImage.findMany({
      where: {
        hotelId: { in: hotelIds },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: { hotelId: true, imageUrl: true },
    });
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (!map[row.hotelId]) map[row.hotelId] = row.imageUrl;
    }
    return map;
  }

  private async isGooglePlacesAvailable(): Promise<boolean> {
    try {
      return (
        this.googlePlacesService &&
        typeof this.googlePlacesService.isConfigured === 'function' &&
        this.googlePlacesService.isConfigured()
      );
    } catch (error) {
      return false;
    }
  }

  private determineImageType(index: number, total: number): string {
    if (index === 0) return 'exterior';
    if (index === 1) return 'interior';
    if (index === 2) return 'room';
    if (index === 3) return 'amenity';
    return 'other';
  }

  async cleanupExpiredImages(): Promise<number> {
    const expiredImages = await this.prisma.hotelImage.findMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    });

    let deletedCount = 0;

    for (const image of expiredImages) {
      try {
        if (image.publicId) {
          await this.cloudinaryService.deleteImage(image.publicId);
        }

        await this.prisma.hotelImage.delete({
          where: { id: image.id },
        });

        deletedCount++;

        const estimatedSizeGB = 0.0002;
        await this.usageTracking.incrementUsage('cloudinary', 'storage_gb', -estimatedSizeGB);
      } catch (error) {
        this.logger.error(`Error deleting expired image ${image.id}:`, error);
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} expired hotel images`);
    return deletedCount;
  }
}

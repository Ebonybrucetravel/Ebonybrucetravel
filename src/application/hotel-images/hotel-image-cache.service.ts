import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GooglePlacesService } from '@infrastructure/external-apis/google-places/google-places.service';
import { CloudinaryService } from '@infrastructure/cloudinary/cloudinary.service';
import { UsageTrackingService } from '@infrastructure/usage-tracking/usage-tracking.service';
import { ImageFallbackService } from '@infrastructure/external-apis/image-fallback/image-fallback.service';

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
  attribution?: string; // Google Places attribution
  message?: string; // User-friendly message about image source
  fallbackUsed?: boolean; // Indicates if fallback images were used
}

@Injectable()
export class HotelImageCacheService {
  private readonly logger = new Logger(HotelImageCacheService.name);
  private readonly CACHE_DURATION_DAYS = 60; // 60 days cache (legal compliance)

  constructor(
    private prisma: PrismaService,
    private googlePlacesService: GooglePlacesService,
    private cloudinaryService: CloudinaryService,
    private usageTracking: UsageTrackingService,
    private imageFallbackService: ImageFallbackService,
  ) {}

  /**
   * Get hotel images with caching
   * Checks cache first, then fetches from Google Places if needed
   */
  async getHotelImages(
    hotelId: string,
    hotelName: string,
    googlePlaceId?: string,
  ): Promise<HotelImageResult> {
    // Step 1: Check cache first
    const cachedImages = await this.prisma.hotelImage.findMany({
      where: {
        hotelId,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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

    // Step 2: Try to fetch from Google Places API (if available)
    // Check if Google Places API is configured
    const googlePlacesAvailable = await this.isGooglePlacesAvailable();

    if (googlePlacesAvailable) {
      try {
        // Check if we've reached API limits
        const isLimitReached = await this.usageTracking.isLimitReached(
          'google_places',
          'requests',
        );

        if (isLimitReached) {
          this.logger.warn(`Google Places API limit reached for hotel ${hotelId}, using fallback`);
          return await this.getFallbackImages(hotelId, hotelName);
        }

        // Step 3: Fetch from Google Places API
        // If no placeId provided, try to search by hotel name
        let placeId = googlePlaceId;
        if (!placeId) {
          const searchResults = await this.googlePlacesService.searchPlaces(hotelName);
          if (searchResults.length > 0) {
            placeId = searchResults[0].place_id;
          } else {
            this.logger.warn(`Hotel "${hotelName}" not found in Google Places, using fallback`);
            return await this.getFallbackImages(hotelId, hotelName);
          }
        }

        // Get place details
        const placeDetails = await this.googlePlacesService.getPlaceDetails(placeId);

        // Track API usage (1 request for place details)
        await this.usageTracking.incrementUsage('google_places', 'requests', 1);

        // Step 4: Fetch and upload photos to Cloudinary
        const images: Array<{ url: string; type: string; source: string; attribution?: string }> = [];
        const photos = placeDetails.photos?.slice(0, 5) || []; // Limit to 5 photos

        if (photos.length === 0) {
          this.logger.warn(`No photos found for hotel ${hotelId}, using fallback`);
          return await this.getFallbackImages(hotelId, hotelName);
        }

        for (let i = 0; i < photos.length; i++) {
          try {
            // Check Cloudinary limits before uploading
            const cloudinaryLimitReached = await this.usageTracking.isLimitReached(
              'cloudinary',
              'storage_gb',
            );

            if (cloudinaryLimitReached) {
              this.logger.warn(`Cloudinary storage limit reached, skipping photo ${i + 1}`);
              break;
            }

            // Fetch photo from Google
            const photoBuffer = await this.googlePlacesService.fetchPhoto(
              photos[i].photo_reference,
              800,
            );

            // Track photo request (separate from place details)
            await this.usageTracking.incrementUsage('google_places', 'requests', 1);

            // Upload to Cloudinary (photoBuffer is already a Buffer)
            const cloudinaryResult = await this.cloudinaryService.uploadImage(
              photoBuffer as Buffer,
              'ebony-bruce-travels/hotels',
              `hotel_${hotelId}_${i}`,
            );

            // Determine image type (exterior, interior, room, etc.)
            const imageType = this.determineImageType(i, photos.length);

            // Store in database
            await this.prisma.hotelImage.create({
              data: {
                hotelId,
                hotelName: placeDetails.name || hotelName,
                imageUrl: cloudinaryResult.url,
                imageType: imageType,
                publicId: cloudinaryResult.publicId,
                source: 'google_places',
                expiresAt: new Date(
                  Date.now() + this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000,
                ),
              },
            });

            images.push({
              url: cloudinaryResult.url,
              type: imageType,
              source: 'google_places',
              attribution: 'Photo from Google Places',
            });

            // Track Cloudinary storage (estimate: ~200KB per image)
            const estimatedSizeGB = 0.0002; // 200KB = 0.0002 GB
            await this.usageTracking.incrementUsage('cloudinary', 'storage_gb', estimatedSizeGB);
          } catch (error) {
            this.logger.error(`Error processing photo ${i + 1} for hotel ${hotelId}:`, error);
            // Continue with next photo
          }
        }

        // If we got at least one image, return it
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
            message: 'Hotel images retrieved successfully',
          };
        }
      } catch (error) {
        // Log error but don't throw - fallback to generic images
        this.logger.warn(
          `Error fetching from Google Places for hotel ${hotelId}, using fallback:`,
          error instanceof Error ? error.message : error,
        );
      }
    } else {
      this.logger.log(`Google Places API not configured, using fallback images for hotel ${hotelId}`);
    }

    // Step 5: Fallback to generic images (Unsplash/Placeholder)
    return await this.getFallbackImages(hotelId, hotelName);
  }

  /**
   * Get fallback images when Google Places is unavailable
   */
  private async getFallbackImages(
    hotelId: string,
    hotelName: string,
  ): Promise<HotelImageResult> {
    try {
      // Get fallback images from Unsplash/Placeholder
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
        message:
          'Hotel-specific images are currently unavailable. Showing generic hotel images for reference.',
      };
    } catch (error) {
      this.logger.error(`Error getting fallback images for hotel ${hotelId}:`, error);
      // Last resort: return empty array with message
      return {
        hotelId,
        hotelName,
        images: [],
        cached: false,
        fallbackUsed: true,
        message:
          'Images are temporarily unavailable. Please check back later or contact support if this persists.',
      };
    }
  }

  /**
   * Check if Google Places API is available and configured
   */
  private async isGooglePlacesAvailable(): Promise<boolean> {
    try {
      // Check if service is properly initialized and has API key
      return (
        this.googlePlacesService &&
        typeof this.googlePlacesService.isConfigured === 'function' &&
        this.googlePlacesService.isConfigured()
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine image type based on position
   */
  private determineImageType(index: number, total: number): string {
    if (index === 0) return 'exterior';
    if (index === 1) return 'interior';
    if (index === 2) return 'room';
    if (index === 3) return 'amenity';
    return 'other';
  }

  /**
   * Clean up expired images (should be called by scheduled job)
   */
  async cleanupExpiredImages(): Promise<number> {
    const expiredImages = await this.prisma.hotelImage.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    let deletedCount = 0;

    for (const image of expiredImages) {
      try {
        // Delete from Cloudinary
        if (image.publicId) {
          await this.cloudinaryService.deleteImage(image.publicId);
        }

        // Delete from database
        await this.prisma.hotelImage.delete({
          where: { id: image.id },
        });

        deletedCount++;

        // Update Cloudinary storage tracking (subtract estimated size)
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


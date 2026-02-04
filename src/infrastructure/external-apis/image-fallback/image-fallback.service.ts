import { Injectable, Logger } from '@nestjs/common';

export interface FallbackImage {
  url: string;
  type: string;
  source: string;
  attribution?: string;
}

@Injectable()
export class ImageFallbackService {
  private readonly logger = new Logger(ImageFallbackService.name);

  /**
   * Get fallback images from Unsplash
   * Note: Unsplash Source API is deprecated, using placeholder.com instead
   */
  async getUnsplashImages(hotelName: string, count: number = 3): Promise<FallbackImage[]> {
    try {
      // Unsplash Source API is deprecated, so we'll use placeholder.com
      // which provides free placeholder images
      return this.getGenericPlaceholderImages(count);
    } catch (error) {
      this.logger.warn('Failed to get Unsplash images:', error);
      return this.getGenericPlaceholderImages(count);
    }
  }

  /**
   * Get fallback images from Pexels
   * Free tier: 200 requests/hour, requires API key (but we can use without key for basic)
   */
  async getPexelsImages(hotelName: string, count: number = 3): Promise<FallbackImage[]> {
    try {
      // Pexels requires API key, but we can use placeholder service
      // For now, return generic hotel images
      return this.getGenericPlaceholderImages(count);
    } catch (error) {
      this.logger.warn('Failed to get Pexels images:', error);
      return this.getGenericPlaceholderImages(count);
    }
  }

  /**
   * Get generic placeholder images
   * Uses placeholder.com or similar free services
   * These are professional-looking placeholder images that won't break the UI
   */
  getGenericPlaceholderImages(count: number = 3): FallbackImage[] {
    const images: FallbackImage[] = [];
    const types = ['exterior', 'interior', 'room', 'amenity', 'lobby'];
    const colors = ['4A90E2', '50C878', 'FF6B6B', 'FFA500', '9B59B6']; // Different colors for variety
    
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const type = types[i % types.length];
      
      // Use placeholder.com with hotel-themed text
      images.push({
        url: `https://via.placeholder.com/800x600/${color}/FFFFFF?text=Hotel+${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type: type,
        source: 'placeholder',
        attribution: 'Generic hotel image',
      });
    }
    
    return images;
  }

  /**
   * Get fallback images (tries multiple sources)
   */
  async getFallbackImages(hotelName: string, count: number = 3): Promise<FallbackImage[]> {
    // Try Unsplash first (no API key needed)
    try {
      const unsplashImages = await this.getUnsplashImages(hotelName, count);
      if (unsplashImages.length > 0) {
        return unsplashImages;
      }
    } catch (error) {
      this.logger.warn('Unsplash fallback failed, using placeholders');
    }

    // Fallback to generic placeholders
    return this.getGenericPlaceholderImages(count);
  }
}


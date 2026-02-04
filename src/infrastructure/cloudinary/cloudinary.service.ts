import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Initialize Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload image to Cloudinary
   * @param file - File buffer, stream, or URL string
   * @param folder - Folder path in Cloudinary (optional)
   * @param publicId - Custom public ID (optional)
   * @returns Cloudinary upload result with secure URL
   */
  async uploadImage(
    file: Buffer | Express.Multer.File | string,
    folder?: string,
    publicId?: string,
  ): Promise<{ url: string; publicId: string }> {
    const uploadOptions: any = {
      resource_type: 'image',
      folder: folder || 'ebony-bruce-travels/users',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { format: 'auto' },
      ],
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    // Handle URL string (for fetching from external source)
    if (typeof file === 'string') {
      const result = await cloudinary.uploader.upload(file, uploadOptions);
      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    // Handle Buffer or Multer file
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        },
      );

      if (Buffer.isBuffer(file)) {
        Readable.from(file).pipe(uploadStream);
      } else {
        Readable.from(file.buffer).pipe(uploadStream);
      }
    });
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - Cloudinary public ID
   * @returns Deletion result
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Don't throw - image might already be deleted
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param url - Cloudinary URL
   * @returns Public ID or null
   */
  extractPublicId(url: string): string | null {
    try {
      const matches = url.match(/\/(?:v\d+\/)?([^\/]+)\.(?:jpg|jpeg|png|gif|webp)/i);
      if (matches && matches[1]) {
        // Remove folder path if present
        const parts = matches[1].split('/');
        return parts[parts.length - 1];
      }
      return null;
    } catch {
      return null;
    }
  }
}


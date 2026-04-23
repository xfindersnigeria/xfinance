import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadResult {
  publicId: string;
  secureUrl: string;
}

@Injectable()
export class FileuploadService {
  constructor(private readonly configService: ConfigService) {
    // Configure Cloudinary once during service initialization
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    // Validate required Cloudinary config
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new NotFoundException('Cloudinary configuration is incomplete');
    }
  }

  /**
   * Build a Cloudinary folder path that follows the groups/{groupId}/... convention.
   *
   * Examples:
   *   buildAssetPath('g1')                          → 'groups/g1'
   *   buildAssetPath('g1', 'e1')                    → 'groups/g1/entities/e1'
   *   buildAssetPath('g1', 'e1', 'employee-profiles') → 'groups/g1/entities/e1/employee-profiles'
   */
  buildAssetPath(groupId: string, entityId?: string, category?: string): string {
    if (entityId && category) return `groups/${groupId}/entities/${entityId}/${category}`;
    if (entityId) return `groups/${groupId}/entities/${entityId}`;
    if (category) return `groups/${groupId}/${category}`;
    return `groups/${groupId}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('Invalid file buffer');
    }

    const fileName = `${Date.now()}-${file.originalname}`; // Unique filename

    const options = {
      folder,
      public_id: fileName,
      resource_type: 'auto' as const, // Handles images, videos, etc.
    };

    return new Promise<UploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            console.log(error);
            reject(
              error instanceof Error
                ? error
                : new Error(
                    typeof error === 'string' ? error : JSON.stringify(error),
                  ),
            );
          } else if (result) {
            resolve({
              publicId: result.public_id,
              secureUrl: result.secure_url,
            });
          } else {
            reject(new Error('Upload result is empty'));
          }
        },
      );

      stream.end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.log(error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : error?.message || 'Unknown error';
      throw new Error(`File deletion failed: ${errorMessage}`);
    }
  }
}

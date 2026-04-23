import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';
import { FileuploadService } from '@/fileupload/fileupload.service';
import { UpdateCustomizationDto, CustomizationResponseDto, DEFAULT_CUSTOMIZATION } from './dto/customization.dto';

@Injectable()
export class CustomizationService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private pubsubService: PubsubService,
    private fileuploadService: FileuploadService,
  ) {}

  private cacheKey(groupId: string) {
    return `customization:${groupId}`;
  }

  /**
   * Build a sanitised response shape from a DB record (or null → defaults).
   */
  private toResponse(record: any | null): CustomizationResponseDto {
    if (!record) return { ...DEFAULT_CUSTOMIZATION };
    return {
      primaryColor: record.primaryColor ?? DEFAULT_CUSTOMIZATION.primaryColor,
      logoUrl: record.logoUrl ?? null,
      loginBgUrl: record.loginBgUrl ?? null,
    };
  }

  /**
   * Resolve group id from a host string (used by the public endpoint).
   * Returns null when subdomain cannot be determined or is not a group.
   */
  async resolveGroupFromHost(host: string): Promise<string | null> {
    if (process.env.DEPLOYMENT_MODE === 'standalone') {
      return process.env.DEFAULT_GROUP_ID ?? null;
    }

    const parts = host.split('.');
    if (parts.length <= 2) return null;
    const subdomain = parts[0];
    if (!subdomain || subdomain === 'admin' || subdomain === 'api' || subdomain === 'localhost') {
      return null;
    }

    const group = await this.prisma.group.findUnique({
      where: { subdomain },
      select: { id: true },
    });
    return group?.id ?? null;
  }

  /**
   * Public: return customization for a group (or defaults when group not found).
   * 1-hour cache — safe for unauthenticated callers.
   */
  async getPublicCustomization(groupId: string | null): Promise<CustomizationResponseDto> {
    if (!groupId) return { ...DEFAULT_CUSTOMIZATION };

    const cached = await this.cacheService.get<CustomizationResponseDto>(this.cacheKey(groupId));
    if (cached) return cached;

    const record = await this.prisma.groupCustomization.findUnique({
      where: { groupId },
    });
    const result = this.toResponse(record);
    await this.cacheService.set(this.cacheKey(groupId), result, { ttl: 3600 });
    return result;
  }

  /**
   * Protected: return full customization record for settings UI.
   */
  async getCustomization(groupId: string) {
    const record = await this.prisma.groupCustomization.findUnique({
      where: { groupId },
    });
    return {
      data: record ?? { groupId, primaryColor: null, logoPublicId: null, logoUrl: null, loginBgPublicId: null, loginBgUrl: null },
      message: 'Customization fetched successfully',
      statusCode: 200,
    };
  }

  /**
   * Protected: update customization. Supports partial updates.
   * Files: logo and loginBg uploaded to Cloudinary.
   * On save: bust cache + publish realtime event.
   */
  async updateCustomization(
    groupId: string,
    dto: UpdateCustomizationDto,
    logoFile?: Express.Multer.File,
    loginBgFile?: Express.Multer.File,
  ) {
    try {
      const existing = await this.prisma.groupCustomization.findUnique({
        where: { groupId },
      });

      let logoPublicId = existing?.logoPublicId;
      let logoUrl = existing?.logoUrl;
      let loginBgPublicId = existing?.loginBgPublicId;
      let loginBgUrl = existing?.loginBgUrl;

      if (logoFile) {
        const folder = this.fileuploadService.buildAssetPath(groupId, undefined, 'customization');
        const uploaded = await this.fileuploadService.uploadFile(logoFile, folder);
        logoPublicId = uploaded.publicId;
        logoUrl = uploaded.secureUrl;
        // Delete old asset if it exists
        if (existing?.logoPublicId) {
          await this.fileuploadService.deleteFile(existing.logoPublicId).catch(() => null);
        }
      }

      if (loginBgFile) {
        const folder = this.fileuploadService.buildAssetPath(groupId, undefined, 'customization');
        const uploaded = await this.fileuploadService.uploadFile(loginBgFile, folder);
        loginBgPublicId = uploaded.publicId;
        loginBgUrl = uploaded.secureUrl;
        if (existing?.loginBgPublicId) {
          await this.fileuploadService.deleteFile(existing.loginBgPublicId).catch(() => null);
        }
      }

      const record = await this.prisma.groupCustomization.upsert({
        where: { groupId },
        create: {
          groupId,
          primaryColor: dto.primaryColor ?? null,
          logoPublicId: logoPublicId ?? null,
          logoUrl: logoUrl ?? null,
          loginBgPublicId: loginBgPublicId ?? null,
          loginBgUrl: loginBgUrl ?? null,
        },
        update: {
          ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
          ...(logoPublicId !== undefined && { logoPublicId, logoUrl }),
          ...(loginBgPublicId !== undefined && { loginBgPublicId, loginBgUrl }),
        },
      });

      // Bust customization cache
      await this.cacheService.delete(this.cacheKey(groupId));
      // Bust whoami cache so every user gets fresh customization on next refetch
      await this.cacheService.deletePattern(`ctx:${groupId}:*`);

      // Notify all connected clients to apply new theme
      await this.pubsubService.publish(`customization-invalidate:${groupId}`, {
        type: 'customization-changed',
        groupId,
        customization: this.toResponse(record),
        timestamp: Date.now(),
      });

      return {
        data: record,
        message: 'Customization updated successfully',
        statusCode: 200,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

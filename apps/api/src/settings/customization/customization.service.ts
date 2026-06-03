import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';
import { FileuploadService } from '@/fileupload/fileupload.service';
import {
  UpdateCustomizationDto,
  CustomizationResponseDto,
  DEFAULT_CUSTOMIZATION,
} from './dto/customization.dto';

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

  private toResponse(record: any | null): CustomizationResponseDto {
    if (!record) return { ...DEFAULT_CUSTOMIZATION };
    return {
      primaryColor: record.primaryColor ?? DEFAULT_CUSTOMIZATION.primaryColor,
      logoUrl: record.logoUrl ?? null,
      loginBgUrl: record.loginBgUrl ?? null,
      siteName: record.siteName || record.slug || null,
      faviconUrl: record.faviconUrl || record.logoUrl || null,
    };
  }

  async resolveGroupFromHost(host: string): Promise<string | null> {
    if (process.env.DEPLOYMENT_MODE === 'standalone') {
      return process.env.DEFAULT_GROUP_ID ?? null;
    }
    const parts = host.split('.');
    if (parts.length <= 2) return null;
    const subdomain = parts[0];
    if (
      !subdomain ||
      subdomain === 'admin' ||
      subdomain === 'api' ||
      subdomain === 'localhost'
    ) {
      return null;
    }
    const group = await this.prisma.group.findUnique({
      where: { subdomain },
      select: { id: true },
    });
    return group?.id ?? null;
  }

  async getPublicCustomization(
    groupId: string | null,
  ): Promise<CustomizationResponseDto> {
    if (!groupId) return { ...DEFAULT_CUSTOMIZATION };

    const cached = await this.cacheService.get<CustomizationResponseDto>(
      this.cacheKey(groupId),
    );
    if (cached) return cached;

    const record = await this.prisma.groupCustomization.findUnique({
      where: { groupId },
    });
    const result = this.toResponse(record);
    await this.cacheService.set(this.cacheKey(groupId), result, { ttl: 3600 });
    return result;
  }

  async getCustomization(groupId: string) {
    const record = await this.prisma.groupCustomization.findUnique({
      where: { groupId },
    });
    return {
      data: record ?? {
        groupId,
        primaryColor: null,
        logoPublicId: null,
        logoUrl: null,
        loginBgPublicId: null,
        loginBgUrl: null,
        siteName: null,
        faviconPublicId: null,
        faviconUrl: null,
      },
      message: 'Customization fetched successfully',
      statusCode: 200,
    };
  }

  async updateCustomization(
    groupId: string,
    dto: UpdateCustomizationDto,
    logoFile?: Express.Multer.File,
    loginBgFile?: Express.Multer.File,
    faviconFile?: Express.Multer.File,
  ) {
    try {
      const existing = await this.prisma.groupCustomization.findUnique({
        where: { groupId },
      });

      let logoPublicId = existing?.logoPublicId;
      let logoUrl = existing?.logoUrl;
      let loginBgPublicId = existing?.loginBgPublicId;
      let loginBgUrl = existing?.loginBgUrl;
      let faviconPublicId = existing?.faviconPublicId;
      let faviconUrl = existing?.faviconUrl;

      if (logoFile) {
        const folder = this.fileuploadService.buildAssetPath(
          groupId,
          undefined,
          'customization',
        );
        const uploaded = await this.fileuploadService.uploadFile(
          logoFile,
          folder,
        );
        logoPublicId = uploaded.publicId;
        logoUrl = uploaded.secureUrl;
        if (existing?.logoPublicId)
          await this.fileuploadService
            .deleteFile(existing.logoPublicId)
            .catch(() => null);
      }

      if (loginBgFile) {
        const folder = this.fileuploadService.buildAssetPath(
          groupId,
          undefined,
          'customization',
        );
        const uploaded = await this.fileuploadService.uploadFile(
          loginBgFile,
          folder,
        );
        loginBgPublicId = uploaded.publicId;
        loginBgUrl = uploaded.secureUrl;
        if (existing?.loginBgPublicId)
          await this.fileuploadService
            .deleteFile(existing.loginBgPublicId)
            .catch(() => null);
      }

      if (faviconFile) {
        const folder = this.fileuploadService.buildAssetPath(
          groupId,
          undefined,
          'customization',
        );
        const uploaded = await this.fileuploadService.uploadFile(
          faviconFile,
          folder,
        );
        faviconPublicId = uploaded.publicId;
        faviconUrl = uploaded.secureUrl;
        if (existing?.faviconPublicId)
          await this.fileuploadService
            .deleteFile(existing.faviconPublicId)
            .catch(() => null);
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
          siteName: dto.siteName ?? null,
          faviconPublicId: faviconPublicId ?? null,
          faviconUrl: faviconUrl ?? null,
        },
        update: {
          ...(dto.primaryColor !== undefined && {
            primaryColor: dto.primaryColor,
          }),
          ...(dto.siteName !== undefined && { siteName: dto.siteName }),
          ...(logoPublicId !== undefined && { logoPublicId, logoUrl }),
          ...(loginBgPublicId !== undefined && { loginBgPublicId, loginBgUrl }),
          ...(faviconPublicId !== undefined && { faviconPublicId, faviconUrl }),
        },
      });

      await this.cacheService.delete(this.cacheKey(groupId));
      await this.cacheService.deletePattern(`ctx:${groupId}:*`);

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

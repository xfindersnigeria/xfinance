import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateEntityConfigDto } from './dto/config.dto';

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  async getEntityConfig(entityId: string, groupId: string) {
    try {
      let settings = await this.prisma.settings.findFirst({ where: { entityId } });
      if (!settings) {
        settings = await this.prisma.settings.create({
          data: { entityId, groupId, baseCurrency: null, multiCurrency: false },
        });
      }
      return {
        data: {
          baseCurrency: settings.baseCurrency,
          multiCurrency: settings.multiCurrency,
          dateFormat: settings.dateFormat,
          numberFormat: settings.numberFormat,
          language: settings.language ?? 'en',
          timezone: settings.timezone ?? 'Africa/Lagos',
          emailNotifications: settings.emailNotifications,
          twoFactorAuth: settings.twoFactorAuth,
          auditLog: settings.auditLog,
        },
        message: 'Entity config fetched successfully',
        statusCode: 200,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateEntityConfig(entityId: string, groupId: string, body: UpdateEntityConfigDto) {
    try {
      const existing = await this.prisma.settings.findFirst({ where: { entityId } });

      const data: any = {};
      if (body.baseCurrency !== undefined) data.baseCurrency = body.baseCurrency;
      if (body.multiCurrency !== undefined) data.multiCurrency = body.multiCurrency;
      if (body.dateFormat !== undefined) data.dateFormat = body.dateFormat;
      if (body.numberFormat !== undefined) data.numberFormat = body.numberFormat;
      if (body.language !== undefined) data.language = body.language;
      if (body.timezone !== undefined) data.timezone = body.timezone;
      if (body.emailNotifications !== undefined) data.emailNotifications = body.emailNotifications;
      if (body.twoFactorAuth !== undefined) data.twoFactorAuth = body.twoFactorAuth;
      if (body.auditLog !== undefined) data.auditLog = body.auditLog;

      let updated;
      if (existing) {
        updated = await this.prisma.settings.update({ where: { id: existing.id }, data });
      } else {
        updated = await this.prisma.settings.create({ data: { entityId, groupId, ...data } });
      }

      return {
        data: {
          baseCurrency: updated.baseCurrency,
          multiCurrency: updated.multiCurrency,
          dateFormat: updated.dateFormat,
          numberFormat: updated.numberFormat,
          language: updated.language ?? 'en',
          timezone: updated.timezone ?? 'Africa/Lagos',
          emailNotifications: updated.emailNotifications,
          twoFactorAuth: updated.twoFactorAuth,
          auditLog: updated.auditLog,
        },
        message: 'Entity config updated successfully',
        statusCode: 200,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

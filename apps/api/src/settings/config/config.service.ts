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
          invoicePrefix: settings.invoicePrefix,
          paymentTerm: settings.paymentTerm,
          lateFees: settings.lateFees,
          paymentReminders: settings.paymentReminders,
          taxRate: settings.taxRate,
          bankName: settings.bankName,
          bankAccountName: settings.bankAccountName,
          bankAccountNumber: settings.bankAccountNumber,
          bankRoutingNumber: settings.bankRoutingNumber,
          bankSwiftCode: settings.bankSwiftCode,
          invoiceNotes: settings.invoiceNotes,
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
      if (body.invoicePrefix !== undefined) data.invoicePrefix = body.invoicePrefix;
      if (body.paymentTerm !== undefined) data.paymentTerm = body.paymentTerm;
      if (body.lateFees !== undefined) data.lateFees = body.lateFees;
      if (body.paymentReminders !== undefined) data.paymentReminders = body.paymentReminders;
      if (body.taxRate !== undefined) data.taxRate = body.taxRate ? Number(body.taxRate) : null;
      if (body.bankName !== undefined) data.bankName = body.bankName;
      if (body.bankAccountName !== undefined) data.bankAccountName = body.bankAccountName;
      if (body.bankAccountNumber !== undefined) data.bankAccountNumber = body.bankAccountNumber;
      if (body.bankRoutingNumber !== undefined) data.bankRoutingNumber = body.bankRoutingNumber;
      if (body.bankSwiftCode !== undefined) data.bankSwiftCode = body.bankSwiftCode;
      if (body.invoiceNotes !== undefined) data.invoiceNotes = body.invoiceNotes;

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
          invoicePrefix: updated.invoicePrefix,
          paymentTerm: updated.paymentTerm,
          lateFees: updated.lateFees,
          paymentReminders: updated.paymentReminders,
          taxRate: updated.taxRate,
          bankName: updated.bankName,
          bankAccountName: updated.bankAccountName,
          bankAccountNumber: updated.bankAccountNumber,
          bankRoutingNumber: updated.bankRoutingNumber,
          bankSwiftCode: updated.bankSwiftCode,
          invoiceNotes: updated.invoiceNotes,
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

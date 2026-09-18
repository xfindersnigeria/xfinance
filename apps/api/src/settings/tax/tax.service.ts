import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateTaxExemptionDto,
  CreateTaxGroupDto,
  CreateTaxJurisdictionDto,
  CreateTaxRateDto,
  UpdateTaxConfigDto,
  UpdateTaxExemptionDto,
  UpdateTaxGroupDto,
  UpdateTaxJurisdictionDto,
  UpdateTaxRateDto,
} from './dto/tax.dto';
import { effectiveGroupRate, getDefaultTax, getEntityTaxSettings } from '@/sales/sales-tax.util';

type Kind = 'tax rate' | 'tax group' | 'exemption' | 'jurisdiction';

/** One pickable tax on a document form (Settings → Tax drives the list). */
export interface TaxOption {
  key: string; // rate:<id> | group:<id> | exemption:<id>
  kind: 'rate' | 'group' | 'exemption';
  label: string;
  rate: number;
  taxName: string; // stored on the document
}

@Injectable()
export class TaxService {
  constructor(private prisma: PrismaService) {}

  private rethrow(e: unknown, kind: Kind): never {
    if (e instanceof HttpException) throw e;
    const code = (e as any)?.code;
    if (code === 'P2002') {
      throw new HttpException(
        kind === 'exemption'
          ? 'An exemption with this code already exists'
          : `A ${kind} with this name already exists`,
        HttpStatus.CONFLICT,
      );
    }
    if (code === 'P2003') {
      throw new HttpException(
        `This ${kind} is used by a tax group — remove it from the group first`,
        HttpStatus.CONFLICT,
      );
    }
    throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
  }

  private async ensureSettings(entityId: string, groupId: string) {
    const existing = await this.prisma.settings.findFirst({ where: { entityId }, select: { id: true } });
    if (existing) return existing.id;
    const created = await this.prisma.settings.create({ data: { entityId, groupId } });
    return created.id;
  }

  // ─── Overview ────────────────────────────────────────────────────────────────

  async getOverview(entityId: string) {
    try {
      const [config, rates, groups, exemptions, jurisdictions] = await Promise.all([
        getEntityTaxSettings(this.prisma, entityId),
        this.prisma.taxRate.findMany({
          where: { entityId },
          include: { jurisdiction: { select: { id: true, name: true } } },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        }),
        this.prisma.taxGroup.findMany({
          where: { entityId },
          include: {
            rates: {
              orderBy: { sortOrder: 'asc' },
              include: { taxRate: { select: { id: true, name: true, rate: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.taxExemption.findMany({ where: { entityId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.taxJurisdiction.findMany({
          where: { entityId },
          include: {
            taxRates: {
              select: { id: true, name: true, rate: true, isActive: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      return {
        data: {
          config,
          rates,
          groups: groups.map((g) => this.mapGroup(g, config.compoundTax)),
          exemptions,
          jurisdictions,
        },
        message: 'Tax settings fetched',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e, 'tax rate');
    }
  }

  private mapGroup(g: any, compound: boolean) {
    const rates = g.rates.map((r: any) => r.taxRate);
    return {
      id: g.id,
      name: g.name,
      isActive: g.isActive,
      rates,
      totalRate: effectiveGroupRate(
        rates.map((r: any) => r.rate),
        compound,
      ),
    };
  }

  /**
   * Everything a document form needs: whether tax is on, the default it should
   * pre-select, and every active rate / group / exemption the user can switch to.
   */
  async getFormOptions(entityId: string) {
    try {
      const [config, defaultTax, rates, groups, exemptions] = await Promise.all([
        getEntityTaxSettings(this.prisma, entityId),
        getDefaultTax(this.prisma, entityId),
        this.prisma.taxRate.findMany({
          where: { entityId, isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        }),
        this.prisma.taxGroup.findMany({
          where: { entityId, isActive: true },
          include: {
            rates: {
              orderBy: { sortOrder: 'asc' },
              include: { taxRate: { select: { id: true, name: true, rate: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.taxExemption.findMany({
          where: { entityId, isActive: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      const fmt = (n: number) => `${Number(n.toFixed(4))}%`;
      const options: TaxOption[] = [
        ...rates.map((r) => ({
          key: `rate:${r.id}`,
          kind: 'rate' as const,
          label: `${r.name} (${fmt(r.rate)})`,
          rate: r.rate,
          taxName: r.name,
        })),
        ...groups.map((g) => {
          const { totalRate } = this.mapGroup(g, config.compoundTax);
          return {
            key: `group:${g.id}`,
            kind: 'group' as const,
            label: `${g.name} (${fmt(totalRate)})`,
            rate: totalRate,
            taxName: g.name,
          };
        }),
        ...exemptions.map((x) => ({
          key: `exemption:${x.id}`,
          kind: 'exemption' as const,
          label: `Exempt — ${x.name} (${x.code})`,
          rate: 0,
          taxName: `Exempt: ${x.name} (${x.code})`,
        })),
      ];

      const defaultRow = rates.find((r) => r.isDefault);
      return {
        data: {
          ...config,
          // What new documents start with (none when tax calculation is off)
          default: config.taxCalculation
            ? {
                key: defaultRow ? `rate:${defaultRow.id}` : null,
                rate: defaultTax.rate,
                taxName: defaultTax.name,
              }
            : null,
          options,
        },
        message: 'Tax options fetched',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e, 'tax rate');
    }
  }

  async updateConfig(entityId: string, groupId: string, dto: UpdateTaxConfigDto) {
    try {
      const id = await this.ensureSettings(entityId, groupId);
      await this.prisma.settings.update({ where: { id }, data: { ...dto } });
      return {
        data: await getEntityTaxSettings(this.prisma, entityId),
        message: 'Tax configuration updated',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e, 'tax rate');
    }
  }

  // ─── Tax rates ───────────────────────────────────────────────────────────────

  private async assertJurisdiction(jurisdictionId: string | null | undefined, entityId: string) {
    if (!jurisdictionId) return;
    const j = await this.prisma.taxJurisdiction.findFirst({ where: { id: jurisdictionId, entityId } });
    if (!j) throw new HttpException('Jurisdiction not found', HttpStatus.BAD_REQUEST);
  }

  /** Only one default per entity; Settings.taxRate mirrors it for older readers. */
  private async applyDefault(tx: any, entityId: string, groupId: string, rateId: string, rate: number) {
    await tx.taxRate.updateMany({
      where: { entityId, isDefault: true, NOT: { id: rateId } },
      data: { isDefault: false },
    });
    const settings = await tx.settings.findFirst({ where: { entityId }, select: { id: true } });
    if (settings) await tx.settings.update({ where: { id: settings.id }, data: { taxRate: rate } });
    else await tx.settings.create({ data: { entityId, groupId, taxRate: rate } });
  }

  async createRate(entityId: string, groupId: string, dto: CreateTaxRateDto) {
    try {
      await this.assertJurisdiction(dto.jurisdictionId, entityId);
      const data = await this.prisma.$transaction(async (tx) => {
        const hasDefault = await tx.taxRate.count({ where: { entityId, isDefault: true } });
        // The first rate an entity adds becomes its default
        const isDefault = dto.isDefault ?? hasDefault === 0;
        const created = await tx.taxRate.create({
          data: {
            name: dto.name.trim(),
            type: dto.type,
            rate: dto.rate,
            isDefault,
            isActive: isDefault ? true : (dto.isActive ?? true),
            jurisdictionId: dto.jurisdictionId || null,
            entityId,
            groupId,
          },
        });
        if (isDefault) await this.applyDefault(tx, entityId, groupId, created.id, created.rate);
        return created;
      });
      return { data, message: 'Tax rate created', statusCode: 201 };
    } catch (e) {
      this.rethrow(e, 'tax rate');
    }
  }

  async updateRate(id: string, entityId: string, groupId: string, dto: UpdateTaxRateDto) {
    try {
      const existing = await this.prisma.taxRate.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Tax rate not found', HttpStatus.NOT_FOUND);
      await this.assertJurisdiction(dto.jurisdictionId, entityId);
      if (existing.isDefault && dto.isDefault === false) {
        throw new HttpException(
          'Make another tax rate the default instead of unsetting this one',
          HttpStatus.BAD_REQUEST,
        );
      }
      const isDefault = dto.isDefault ?? existing.isDefault;
      if (isDefault && dto.isActive === false) {
        throw new HttpException('The default tax rate cannot be inactive', HttpStatus.BAD_REQUEST);
      }
      const data = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.taxRate.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            type: dto.type,
            rate: dto.rate,
            isDefault,
            isActive: isDefault ? true : dto.isActive,
            jurisdictionId: dto.jurisdictionId === undefined ? undefined : dto.jurisdictionId || null,
          },
        });
        if (isDefault) await this.applyDefault(tx, entityId, groupId, updated.id, updated.rate);
        return updated;
      });
      return { data, message: 'Tax rate updated', statusCode: 200 };
    } catch (e) {
      this.rethrow(e, 'tax rate');
    }
  }

  async deleteRate(id: string, entityId: string) {
    try {
      const existing = await this.prisma.taxRate.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Tax rate not found', HttpStatus.NOT_FOUND);
      if (existing.isDefault) {
        throw new HttpException(
          'The default tax rate cannot be deleted — make another rate the default first',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.prisma.taxRate.delete({ where: { id } });
      return { data: null, message: 'Tax rate deleted', statusCode: 200 };
    } catch (e) {
      this.rethrow(e, 'tax rate');
    }
  }

  // ─── Tax groups ──────────────────────────────────────────────────────────────

  private async assertRates(ids: string[], entityId: string) {
    const unique = [...new Set(ids)];
    const count = await this.prisma.taxRate.count({ where: { id: { in: unique }, entityId } });
    if (count !== unique.length) {
      throw new HttpException('One or more tax rates were not found', HttpStatus.BAD_REQUEST);
    }
    return unique;
  }

  async createGroup(entityId: string, groupId: string, dto: CreateTaxGroupDto) {
    try {
      const rateIds = await this.assertRates(dto.taxRateIds, entityId);
      const data = await this.prisma.taxGroup.create({
        data: {
          name: dto.name.trim(),
          isActive: dto.isActive ?? true,
          entityId,
          groupId,
          rates: {
            create: rateIds.map((taxRateId, sortOrder) => ({ taxRateId, sortOrder, groupId })),
          },
        },
      });
      return { data, message: 'Tax group created', statusCode: 201 };
    } catch (e) {
      this.rethrow(e, 'tax group');
    }
  }

  async updateGroup(id: string, entityId: string, dto: UpdateTaxGroupDto) {
    try {
      const existing = await this.prisma.taxGroup.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Tax group not found', HttpStatus.NOT_FOUND);
      const rateIds = dto.taxRateIds ? await this.assertRates(dto.taxRateIds, entityId) : null;
      const data = await this.prisma.$transaction(async (tx) => {
        if (rateIds) {
          await tx.taxGroupRate.deleteMany({ where: { taxGroupId: id } });
          await tx.taxGroupRate.createMany({
            data: rateIds.map((taxRateId, sortOrder) => ({
              taxGroupId: id,
              taxRateId,
              sortOrder,
              groupId: existing.groupId,
            })),
          });
        }
        return tx.taxGroup.update({
          where: { id },
          data: { name: dto.name?.trim(), isActive: dto.isActive },
        });
      });
      return { data, message: 'Tax group updated', statusCode: 200 };
    } catch (e) {
      this.rethrow(e, 'tax group');
    }
  }

  async deleteGroup(id: string, entityId: string) {
    try {
      const existing = await this.prisma.taxGroup.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Tax group not found', HttpStatus.NOT_FOUND);
      await this.prisma.taxGroup.delete({ where: { id } });
      return { data: null, message: 'Tax group deleted', statusCode: 200 };
    } catch (e) {
      this.rethrow(e, 'tax group');
    }
  }

  // ─── Exemptions ──────────────────────────────────────────────────────────────

  async createExemption(entityId: string, groupId: string, dto: CreateTaxExemptionDto) {
    try {
      const data = await this.prisma.taxExemption.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          description: dto.description,
          isActive: dto.isActive ?? true,
          entityId,
          groupId,
        },
      });
      return { data, message: 'Exemption created', statusCode: 201 };
    } catch (e) {
      this.rethrow(e, 'exemption');
    }
  }

  async updateExemption(id: string, entityId: string, dto: UpdateTaxExemptionDto) {
    try {
      const existing = await this.prisma.taxExemption.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Exemption not found', HttpStatus.NOT_FOUND);
      const data = await this.prisma.taxExemption.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          description: dto.description,
          isActive: dto.isActive,
        },
      });
      return { data, message: 'Exemption updated', statusCode: 200 };
    } catch (e) {
      this.rethrow(e, 'exemption');
    }
  }

  async deleteExemption(id: string, entityId: string) {
    try {
      const existing = await this.prisma.taxExemption.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Exemption not found', HttpStatus.NOT_FOUND);
      await this.prisma.taxExemption.delete({ where: { id } });
      return { data: null, message: 'Exemption deleted', statusCode: 200 };
    } catch (e) {
      this.rethrow(e, 'exemption');
    }
  }

  // ─── Jurisdictions ───────────────────────────────────────────────────────────

  async createJurisdiction(entityId: string, groupId: string, dto: CreateTaxJurisdictionDto) {
    try {
      const data = await this.prisma.taxJurisdiction.create({
        data: {
          name: dto.name.trim(),
          description: dto.description,
          countryCode: dto.countryCode ? dto.countryCode.toUpperCase() : null,
          isActive: dto.isActive ?? true,
          entityId,
          groupId,
        },
      });
      return { data, message: 'Jurisdiction created', statusCode: 201 };
    } catch (e) {
      this.rethrow(e, 'jurisdiction');
    }
  }

  async updateJurisdiction(id: string, entityId: string, dto: UpdateTaxJurisdictionDto) {
    try {
      const existing = await this.prisma.taxJurisdiction.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Jurisdiction not found', HttpStatus.NOT_FOUND);
      const data = await this.prisma.taxJurisdiction.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description,
          countryCode:
            dto.countryCode === undefined ? undefined : dto.countryCode ? dto.countryCode.toUpperCase() : null,
          isActive: dto.isActive,
        },
      });
      return { data, message: 'Jurisdiction updated', statusCode: 200 };
    } catch (e) {
      this.rethrow(e, 'jurisdiction');
    }
  }

  async deleteJurisdiction(id: string, entityId: string) {
    try {
      const existing = await this.prisma.taxJurisdiction.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Jurisdiction not found', HttpStatus.NOT_FOUND);
      // Its rates stay (jurisdiction is cleared on them)
      await this.prisma.taxJurisdiction.delete({ where: { id } });
      return { data: null, message: 'Jurisdiction deleted', statusCode: 200 };
    } catch (e) {
      this.rethrow(e, 'jurisdiction');
    }
  }
}

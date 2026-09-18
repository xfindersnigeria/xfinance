import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface GroupReportEntity {
  id: string;
  name: string;
  /** The entity's own reporting currency */
  currency: string;
  /** Units of `currency` per 1 unit of the group base currency (GroupCurrency.exchangeRate) */
  rate: number | null;
  /** false when the entity's currency has no conversion rate — excluded from every figure */
  included: boolean;
}

export interface GroupReportContext {
  groupId: string;
  currency: { code: string; symbol: string };
  entities: GroupReportEntity[];
  /** Problems the admin should fix (missing rates / primary currency) */
  warnings: string[];
  /** Informational (e.g. which rates were used) */
  notes: string[];
}

/**
 * Resolves the currency context for group reports. Group reports are always
 * presented in the group's primary (base) currency. Each entity reports in its
 * own base currency (Settings.baseCurrency, falling back to Entity.currency);
 * amounts are converted with the rates the group sets under Admin → Settings →
 * Currency, where a rate means "units of this currency per 1 base unit", so
 * base amount = entity amount ÷ rate.
 *
 * An entity whose currency has no rate is excluded (never silently treated as
 * 1:1) and a warning tells the admin to add the rate.
 */
@Injectable()
export class GroupCurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(groupId: string): Promise<GroupReportContext> {
    const [entities, currencies] = await Promise.all([
      this.prisma.entity.findMany({
        where: { groupId },
        select: { id: true, name: true, currency: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.groupCurrency.findMany({
        where: { groupId, isActive: true },
        select: { code: true, symbol: true, exchangeRate: true, isPrimary: true },
      }),
    ]);

    const settings = await this.prisma.settings.findMany({
      where: { entityId: { in: entities.map((e) => e.id) } },
      select: { entityId: true, baseCurrency: true },
    });
    const baseByEntity = new Map(settings.map((s) => [s.entityId, s.baseCurrency]));

    const warnings: string[] = [];
    const primary = currencies.find((c) => c.isPrimary);
    const entityCurrency = (e: { id: string; currency: string | null }) =>
      (baseByEntity.get(e.id) || e.currency || '').toUpperCase();

    let baseCode = primary?.code?.toUpperCase() ?? '';
    let baseSymbol = primary?.symbol ?? '';
    if (!baseCode) {
      // No primary currency configured — fall back to the first entity's
      // currency so single-currency groups still work, and say so.
      baseCode = entities.map(entityCurrency).find(Boolean) ?? '';
      baseSymbol = baseCode;
      warnings.push(
        `No primary currency is set for this group, so reports are shown in ${baseCode || 'the entities’ own currency'}. Set a primary currency under Admin → Settings → Currency.`,
      );
    }

    const rateByCode = new Map(currencies.map((c) => [c.code.toUpperCase(), c.exchangeRate]));

    const resolved: GroupReportEntity[] = entities.map((e) => {
      const currency = entityCurrency(e) || baseCode;
      if (currency === baseCode) return { id: e.id, name: e.name, currency, rate: 1, included: true };
      const rate = rateByCode.get(currency);
      if (rate && rate > 0) return { id: e.id, name: e.name, currency, rate, included: true };
      warnings.push(
        `${e.name} reports in ${currency}, but the group has no ${currency} exchange rate. It is left out of these figures — add a ${currency} conversion rate under Admin → Settings → Currency to include it.`,
      );
      return { id: e.id, name: e.name, currency, rate: null, included: false };
    });

    const notes: string[] = [];
    if (resolved.some((e) => e.included && e.currency !== baseCode)) {
      notes.push(
        `Amounts in other currencies are converted to ${baseCode} at the rates currently set for the group (Admin → Settings → Currency).`,
      );
    }

    return { groupId, currency: { code: baseCode, symbol: baseSymbol || baseCode }, entities: resolved, warnings, notes };
  }

  /** Convert an entity-currency amount to the group base currency */
  static toBase(amount: number, entity: GroupReportEntity): number {
    if (!entity.included || !entity.rate) return 0;
    return amount / entity.rate;
  }
}

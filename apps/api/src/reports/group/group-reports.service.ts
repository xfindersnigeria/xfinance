import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportsService } from '../reports.service';
import {
  GroupCurrencyService,
  GroupReportContext,
  GroupReportEntity,
} from './group-currency.service';

/** An amount per entity (in group base currency) plus the consolidated total */
export interface GroupAmount {
  byEntity: Record<string, number>;
  total: number;
  /** Consolidated total for the comparison period / date (0 when none) */
  comparison: number;
}

export interface GroupLine extends GroupAmount {
  key: string;
  code: string;
  name: string;
}

export interface GroupSection extends GroupAmount {
  label: string;
  lines: GroupLine[];
}

type ReportMeta = Pick<GroupReportContext, 'currency' | 'entities' | 'warnings' | 'notes'>;

const round2 = (n: number) => Math.round(n * 100) / 100;

const emptyAmount = (): GroupAmount => ({ byEntity: {}, total: 0, comparison: 0 });

/**
 * Consolidated (group-level) reports. Every figure is built from the same
 * per-entity report logic the entity reports use (ReportsService), converted
 * to the group base currency (GroupCurrencyService) and summed.
 *
 * Intercompany eliminations are not applied — there is no intercompany data
 * model yet, so consolidated totals are straight aggregations.
 */
@Injectable()
export class GroupReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly currencyService: GroupCurrencyService,
  ) {}

  async getContext(groupId: string): Promise<GroupReportContext> {
    return this.currencyService.resolve(groupId);
  }

  // ─── Consolidated Profit & Loss ─────────────────────────────────────────────

  async getConsolidatedProfitAndLoss(
    groupId: string,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ) {
    const ctx = await this.currencyService.resolve(groupId);
    const included = ctx.entities.filter((e) => e.included);

    const reports = await Promise.all(
      included.map(async (entity) => ({
        entity,
        report: await this.reportsService.getProfitAndLoss(entity.id, startDate, endDate, compareStartDate, compareEndDate),
      })),
    );

    const sectionKeys = ['revenue', 'otherIncome', 'cogs', 'operatingExpenses', 'otherExpenses'] as const;
    const labels: Record<(typeof sectionKeys)[number], string> = {
      revenue: 'Revenue',
      otherIncome: 'Other Income',
      cogs: 'Cost of Goods Sold',
      operatingExpenses: 'Operating Expenses',
      otherExpenses: 'Other Expenses',
    };

    const sections = Object.fromEntries(
      sectionKeys.map((key) => {
        const builder = new SectionBuilder(labels[key]);
        for (const { entity, report } of reports) {
          const section = report[key];
          for (const line of section.accounts) {
            builder.add(entity, line.code, line.name, line.actual, line.comparison);
          }
        }
        return [key, builder.build()];
      }),
    ) as Record<(typeof sectionKeys)[number], GroupSection>;

    const kpi = (pick: (r: (typeof reports)[number]['report']) => { actual: number; comparison: number }) => {
      const out = emptyAmount();
      for (const { entity, report } of reports) {
        const v = pick(report);
        addTo(out, entity, v.actual, v.comparison);
      }
      return finish(out);
    };

    return {
      ...meta(ctx),
      period: { startDate: iso(startDate), endDate: iso(endDate) },
      comparePeriod: compareStartDate && compareEndDate ? { startDate: iso(compareStartDate), endDate: iso(compareEndDate) } : null,
      sections,
      grossProfit: kpi((r) => r.grossProfit),
      operatingProfit: kpi((r) => r.operatingProfit),
      netProfit: kpi((r) => r.netProfit),
      totalRevenue: kpi((r) => r.kpis.totalRevenue),
    };
  }

  // ─── Consolidated Balance Sheet ─────────────────────────────────────────────

  async getConsolidatedBalanceSheet(groupId: string, asOfDate: Date, compareAsOfDate?: Date) {
    const ctx = await this.currencyService.resolve(groupId);
    const included = ctx.entities.filter((e) => e.included);

    const reports = await Promise.all(
      included.map(async (entity) => ({
        entity,
        report: await this.reportsService.getBalanceSheet(entity.id, asOfDate, compareAsOfDate),
      })),
    );

    const build = (label: string, pick: (r: (typeof reports)[number]['report']) => { accounts: any[] } | undefined) => {
      const builder = new SectionBuilder(label);
      for (const { entity, report } of reports) {
        for (const line of pick(report)?.accounts ?? []) {
          builder.add(entity, line.code, line.name, line.balance, line.comparison);
        }
      }
      return builder.build();
    };

    // Equity sections are labelled per entity chart; merge them by label
    const equityLabels = [...new Set(reports.flatMap(({ report }) => report.equity.sections.map((s) => s.label)))];
    const equitySections = equityLabels.map((label) =>
      build(label, (r) => r.equity.sections.find((s) => s.label === label)),
    );

    const total = (pick: (r: (typeof reports)[number]['report']) => [number, number]) => {
      const out = emptyAmount();
      for (const { entity, report } of reports) {
        const [actual, comparison] = pick(report);
        addTo(out, entity, actual, comparison);
      }
      return finish(out);
    };

    const totalAssets = total((r) => [r.assets.total, r.assets.comparison]);
    const totalLiabilitiesAndEquity = total((r) => [r.totalLiabilitiesAndEquity, r.totalLiabilitiesAndEquityComparison]);

    return {
      ...meta(ctx),
      asOfDate: iso(asOfDate),
      compareAsOfDate: compareAsOfDate ? iso(compareAsOfDate) : null,
      assets: {
        current: build('Current Assets', (r) => r.assets.current),
        nonCurrent: build('Non-Current Assets', (r) => r.assets.nonCurrent),
        total: totalAssets,
      },
      liabilities: {
        current: build('Current Liabilities', (r) => r.liabilities.current),
        longTerm: build('Long-Term Liabilities', (r) => r.liabilities.longTerm),
        total: total((r) => [r.liabilities.total, r.liabilities.comparison]),
      },
      equity: {
        sections: equitySections,
        retainedEarnings: total((r) => [r.equity.retainedEarnings, r.equity.retainedEarningsComparison]),
        total: total((r) => [r.equity.total, r.equity.comparison]),
      },
      totalLiabilitiesAndEquity,
      // Each entity balances and one rate applies to all of its lines, so the
      // converted consolidation balances too; checked rather than assumed.
      isBalanced: Math.abs(totalAssets.total - totalLiabilitiesAndEquity.total) < 1,
    };
  }

  // ─── Consolidated Cash Flow Statement ───────────────────────────────────────

  async getConsolidatedCashFlow(
    groupId: string,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ) {
    const ctx = await this.currencyService.resolve(groupId);
    const included = ctx.entities.filter((e) => e.included);

    const reports = await Promise.all(
      included.map(async (entity) => ({
        entity,
        report: await this.reportsService.getCashFlowStatement(entity.id, startDate, endDate, compareStartDate, compareEndDate),
      })),
    );

    type CF = (typeof reports)[number]['report'];
    const line = (key: string, label: string, pick: (r: CF) => { actual: number; comparison: number }) => {
      const out = emptyAmount();
      for (const { entity, report } of reports) {
        const v = pick(report);
        addTo(out, entity, v.actual, v.comparison);
      }
      return { key, label, ...finish(out) };
    };

    return {
      ...meta(ctx),
      period: { startDate: iso(startDate), endDate: iso(endDate) },
      comparePeriod: compareStartDate && compareEndDate ? { startDate: iso(compareStartDate), endDate: iso(compareEndDate) } : null,
      operating: [
        line('netProfit', 'Net Profit', (r) => r.operating.netProfit),
        line('depreciation', 'Depreciation & Amortisation', (r) => r.operating.depreciation),
        line('arChange', 'Change in Accounts Receivable', (r) => r.operating.arChange),
        line('inventoryChange', 'Change in Inventory', (r) => r.operating.inventoryChange),
        line('prepaidChange', 'Change in Prepaid Expenses', (r) => r.operating.prepaidChange),
        line('apChange', 'Change in Accounts Payable', (r) => r.operating.apChange),
        line('wagesPayableChange', 'Change in Wages Payable', (r) => r.operating.wagesPayableChange),
        line('deferredRevenueChange', 'Change in Deferred Revenue', (r) => r.operating.deferredRevenueChange),
      ],
      operatingTotal: line('operatingTotal', 'Net Cash from Operating Activities', (r) => r.operating.netCash),
      investing: [
        line('fixedAssetsChange', 'Purchase / Sale of Fixed Assets', (r) => r.investing.fixedAssetsChange),
        line('intangibleAssetsChange', 'Purchase / Sale of Intangible Assets', (r) => r.investing.intangibleAssetsChange),
      ],
      investingTotal: line('investingTotal', 'Net Cash from Investing Activities', (r) => r.investing.netCash),
      financing: [
        line('longTermDebtChange', 'Change in Long-Term Debt', (r) => r.financing.longTermDebtChange),
        line('capitalStockChange', 'Change in Share Capital', (r) => r.financing.capitalStockChange),
      ],
      financingTotal: line('financingTotal', 'Net Cash from Financing Activities', (r) => r.financing.netCash),
      netCashChange: line('netCashChange', 'Net Change in Cash', (r) => r.netCashChange),
      cashAtStart: line('cashAtStart', 'Cash at Beginning of Period', (r) => r.cashAtStart),
      cashAtEnd: line('cashAtEnd', 'Cash at End of Period', (r) => r.cashAtEnd),
    };
  }

  // ─── Entity comparison (revenue / profitability / expenses) ─────────────────

  /**
   * Per-entity P&L metrics for the period and the comparison period, plus a
   * monthly trend for the 12 months ending at `endDate`. Serves Entity Revenue
   * Comparison, Entity Profitability Analysis and Entity Expense Comparison.
   */
  async getEntityComparison(
    groupId: string,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ) {
    const ctx = await this.currencyService.resolve(groupId);
    const included = ctx.entities.filter((e) => e.included);

    const [reports, trend] = await Promise.all([
      Promise.all(
        included.map(async (entity) => ({
          entity,
          report: await this.reportsService.getProfitAndLoss(entity.id, startDate, endDate, compareStartDate, compareEndDate),
        })),
      ),
      this.monthlyTrend(included, endDate),
    ]);

    const metrics = (pick: 'actual' | 'comparison', r: (typeof reports)[number]['report'], e: GroupReportEntity) => {
      const c = (n: number) => round2(GroupCurrencyService.toBase(n, e));
      const revenue = c(r.revenue[pick]);
      const otherIncome = c(r.otherIncome[pick]);
      const cogs = c(r.cogs[pick]);
      const operatingExpenses = c(r.operatingExpenses[pick]);
      const otherExpenses = c(r.otherExpenses[pick]);
      const grossProfit = c(r.grossProfit[pick]);
      const operatingProfit = c(r.operatingProfit[pick]);
      const netProfit = c(r.netProfit[pick]);
      const totalIncome = revenue + otherIncome;
      const pct = (n: number) => (revenue ? round2((n / revenue) * 100) : null);
      return {
        revenue,
        otherIncome,
        totalIncome,
        cogs,
        operatingExpenses,
        otherExpenses,
        totalExpenses: round2(cogs + operatingExpenses + otherExpenses),
        grossProfit,
        operatingProfit,
        netProfit,
        grossMargin: pct(grossProfit),
        operatingMargin: pct(operatingProfit),
        netMargin: pct(netProfit),
        expenseRatio: pct(cogs + operatingExpenses + otherExpenses),
      };
    };

    const hasComparison = !!(compareStartDate && compareEndDate);
    const entities = reports.map(({ entity, report }) => {
      const current = metrics('actual', report, entity);
      const previous = hasComparison ? metrics('comparison', report, entity) : null;
      const growth = (a: number, b?: number) => (previous && b ? round2(((a - b) / Math.abs(b)) * 100) : null);
      // Expense lines per account for Entity Expense Comparison
      const expenseLines = [
        ...report.cogs.accounts.map((a) => ({ ...a, section: 'Cost of Goods Sold' })),
        ...report.operatingExpenses.accounts.map((a) => ({ ...a, section: 'Operating Expenses' })),
        ...report.otherExpenses.accounts.map((a) => ({ ...a, section: 'Other Expenses' })),
      ].map((a) => ({
        code: a.code,
        name: a.name,
        section: a.section,
        amount: round2(GroupCurrencyService.toBase(a.actual, entity)),
        comparison: round2(GroupCurrencyService.toBase(a.comparison, entity)),
      }));
      return {
        id: entity.id,
        name: entity.name,
        currency: entity.currency,
        current,
        previous,
        growth: {
          revenue: growth(current.revenue, previous?.revenue),
          totalExpenses: growth(current.totalExpenses, previous?.totalExpenses),
          netProfit: growth(current.netProfit, previous?.netProfit),
        },
        expenseLines,
      };
    });

    const sum = (pick: (m: ReturnType<typeof metrics>) => number, which: 'current' | 'previous') =>
      round2(entities.reduce((s, e) => s + (e[which] ? pick(e[which]!) : 0), 0));
    const totals = {
      revenue: sum((m) => m.revenue, 'current'),
      totalExpenses: sum((m) => m.totalExpenses, 'current'),
      grossProfit: sum((m) => m.grossProfit, 'current'),
      operatingProfit: sum((m) => m.operatingProfit, 'current'),
      netProfit: sum((m) => m.netProfit, 'current'),
      previousRevenue: hasComparison ? sum((m) => m.revenue, 'previous') : null,
      previousTotalExpenses: hasComparison ? sum((m) => m.totalExpenses, 'previous') : null,
      previousNetProfit: hasComparison ? sum((m) => m.netProfit, 'previous') : null,
    };

    return {
      ...meta(ctx),
      period: { startDate: iso(startDate), endDate: iso(endDate) },
      comparePeriod: hasComparison ? { startDate: iso(compareStartDate!), endDate: iso(compareEndDate!) } : null,
      rows: entities,
      totals,
      trend,
    };
  }

  // ─── Group Cash Flow Forecast ───────────────────────────────────────────────

  /**
   * Sums each entity's cash flow forecast (ReportsService.getCashFlowForecast —
   * cash position + open invoices/bills by due date + 3-month run-rate),
   * converted to the group base currency, and flags entities projected to run
   * out of cash within the horizon.
   */
  async getGroupCashFlowForecast(groupId: string, months: number, asOf: Date) {
    const ctx = await this.currencyService.resolve(groupId);
    const included = ctx.entities.filter((e) => e.included);

    const forecasts = await Promise.all(
      included.map(async (entity) => ({
        entity,
        forecast: await this.reportsService.getCashFlowForecast(entity.id, months, asOf),
      })),
    );

    const c = (n: number, e: GroupReportEntity) => GroupCurrencyService.toBase(n, e);

    // Every entity forecast uses the same month grid (same asOf + horizon)
    const grid = forecasts[0]?.forecast.buckets.map((b) => ({ month: b.month, label: b.label })) ?? [];
    const buckets = grid.map(({ month, label }) => {
      const agg = {
        month,
        label,
        openingCash: 0,
        inflows: { receivables: 0, recurring: 0, total: 0 },
        outflows: { payables: 0, recurring: 0, total: 0 },
        net: 0,
        closingCash: 0,
        closingByEntity: {} as Record<string, number>,
      };
      for (const { entity, forecast } of forecasts) {
        const b = forecast.buckets.find((x) => x.month === month);
        if (!b) continue;
        agg.openingCash += c(b.openingCash, entity);
        agg.inflows.receivables += c(b.inflows.receivables, entity);
        agg.inflows.recurring += c(b.inflows.recurring, entity);
        agg.inflows.total += c(b.inflows.total, entity);
        agg.outflows.payables += c(b.outflows.payables, entity);
        agg.outflows.recurring += c(b.outflows.recurring, entity);
        agg.outflows.total += c(b.outflows.total, entity);
        agg.net += c(b.net, entity);
        agg.closingCash += c(b.closingCash, entity);
        agg.closingByEntity[entity.id] = round2(c(b.closingCash, entity));
      }
      return {
        ...agg,
        openingCash: round2(agg.openingCash),
        inflows: { receivables: round2(agg.inflows.receivables), recurring: round2(agg.inflows.recurring), total: round2(agg.inflows.total) },
        outflows: { payables: round2(agg.outflows.payables), recurring: round2(agg.outflows.recurring), total: round2(agg.outflows.total) },
        net: round2(agg.net),
        closingCash: round2(agg.closingCash),
      };
    });

    const entities = forecasts.map(({ entity, forecast }) => {
      const s = forecast.summary;
      return {
        id: entity.id,
        name: entity.name,
        currentCash: round2(c(s.currentCash, entity)),
        totalInflows: round2(c(s.totalInflows, entity)),
        totalOutflows: round2(c(s.totalOutflows, entity)),
        endingCash: round2(c(s.endingCash, entity)),
        lowestCash: round2(c(s.lowestCash, entity)),
        lowestCashMonth: s.lowestCashMonth,
        overdueReceivables: round2(c(s.overdueReceivables, entity)),
        overduePayables: round2(c(s.overduePayables, entity)),
        /** Below zero now or projected to be at some point in the horizon */
        atRisk: s.lowestCash < 0 || s.currentCash < 0,
      };
    });

    const sum = (pick: (e: (typeof entities)[number]) => number) => round2(entities.reduce((t, e) => t + pick(e), 0));
    // Today's position counts too — cash can already be negative before any forecast month
    const lowest = buckets.reduce<{ value: number; month: string | null }>(
      (min, b) => (b.closingCash < min.value ? { value: b.closingCash, month: b.label } : min),
      { value: sum((e) => e.currentCash), month: 'Now' },
    );
    const breakdown = (pick: (f: (typeof forecasts)[number]['forecast']) => number) =>
      round2(forecasts.reduce((t, { entity, forecast }) => t + c(pick(forecast), entity), 0));

    return {
      ...meta(ctx),
      asOfDate: iso(asOf),
      months,
      method: forecasts[0]?.forecast.method ?? null,
      summary: {
        currentCash: sum((e) => e.currentCash),
        totalInflows: sum((e) => e.totalInflows),
        totalOutflows: sum((e) => e.totalOutflows),
        netChange: round2(sum((e) => e.totalInflows) - sum((e) => e.totalOutflows)),
        endingCash: sum((e) => e.endingCash),
        overdueReceivables: sum((e) => e.overdueReceivables),
        overduePayables: sum((e) => e.overduePayables),
        lowestCash: round2(lowest.value),
        lowestCashMonth: lowest.month,
        entitiesAtRisk: entities.filter((e) => e.atRisk).length,
      },
      inflowBreakdown: {
        receivables: breakdown((f) => f.inflowBreakdown.receivables),
        recurring: breakdown((f) => f.inflowBreakdown.recurring),
      },
      outflowBreakdown: {
        payables: breakdown((f) => f.outflowBreakdown.payables),
        recurringExpenses: breakdown((f) => f.outflowBreakdown.recurringExpenses),
        recurringPayroll: breakdown((f) => f.outflowBreakdown.recurringPayroll),
      },
      buckets,
      entityForecasts: entities,
    };
  }

  /**
   * Monthly revenue / expenses / net profit per entity for the 12 months ending
   * at `endDate`, in group base currency. One query over the P&L accounts,
   * bucketed with the same rules as ReportsService.fetchPLSections (category
   * codes 4100/4200 income, 5100/5200/5300 expenses; income = credit − debit,
   * expenses = debit − credit).
   */
  private async monthlyTrend(entities: GroupReportEntity[], endDate: Date) {
    const end = new Date(endDate);
    const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    if (entities.length === 0) return months.map((month) => ({ month, byEntity: {} as Record<string, TrendPoint> }));

    const txns = await this.prisma.accountTransaction.findMany({
      where: {
        entityId: { in: entities.map((e) => e.id) },
        status: { not: 'Failed' } as any,
        date: { gte: start, lte: end },
        account: { subCategory: { category: { type: { code: { in: ['4000', '5000'] } } } } },
      },
      select: {
        entityId: true,
        date: true,
        debitAmount: true,
        creditAmount: true,
        account: { select: { subCategory: { select: { category: { select: { code: true } } } } } },
      },
    });

    const byId = new Map(entities.map((e) => [e.id, e]));
    const buckets = new Map<string, Record<string, TrendPoint>>(months.map((m) => [m, {}]));
    for (const tx of txns) {
      const d = new Date(tx.date);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(month);
      const entity = byId.get(tx.entityId);
      if (!bucket || !entity) continue;
      const point = (bucket[entity.id] ??= { revenue: 0, expenses: 0, netProfit: 0 });
      const cat = tx.account.subCategory.category.code;
      if (cat === '4100' || cat === '4200') {
        const v = GroupCurrencyService.toBase(tx.creditAmount - tx.debitAmount, entity);
        point.revenue += v;
        point.netProfit += v;
      } else if (cat === '5100' || cat === '5200' || cat === '5300') {
        const v = GroupCurrencyService.toBase(tx.debitAmount - tx.creditAmount, entity);
        point.expenses += v;
        point.netProfit -= v;
      }
    }

    return months.map((month) => {
      const byEntity = buckets.get(month)!;
      for (const p of Object.values(byEntity)) {
        p.revenue = round2(p.revenue);
        p.expenses = round2(p.expenses);
        p.netProfit = round2(p.netProfit);
      }
      return { month, byEntity };
    });
  }
}

export interface TrendPoint {
  revenue: number;
  expenses: number;
  netProfit: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function iso(d: Date) {
  return d.toISOString().split('T')[0];
}

function meta(ctx: GroupReportContext): ReportMeta {
  return { currency: ctx.currency, entities: ctx.entities, warnings: ctx.warnings, notes: ctx.notes };
}

function addTo(target: GroupAmount, entity: GroupReportEntity, actual: number, comparison: number) {
  const a = GroupCurrencyService.toBase(actual, entity);
  target.byEntity[entity.id] = (target.byEntity[entity.id] ?? 0) + a;
  target.total += a;
  target.comparison += GroupCurrencyService.toBase(comparison, entity);
}

function finish<T extends GroupAmount>(amount: T): T {
  for (const k of Object.keys(amount.byEntity)) amount.byEntity[k] = round2(amount.byEntity[k]);
  amount.total = round2(amount.total);
  amount.comparison = round2(amount.comparison);
  return amount;
}

/**
 * Merges account lines across entities. Account codes are allocated per entity
 * (e.g. 4110-02 can be a different account in two entities), so lines merge
 * only when both code and name match; otherwise they stay separate rows.
 */
class SectionBuilder {
  private lines = new Map<string, GroupLine>();
  private totals = emptyAmount();

  constructor(private readonly label: string) {}

  add(entity: GroupReportEntity, code: string, name: string, actual: number, comparison: number) {
    const key = `${code}|${name.trim().toLowerCase()}`;
    let line = this.lines.get(key);
    if (!line) {
      line = { key, code, name, ...emptyAmount() };
      this.lines.set(key, line);
    }
    addTo(line, entity, actual, comparison);
    addTo(this.totals, entity, actual, comparison);
  }

  build(): GroupSection {
    const lines = [...this.lines.values()]
      .map((l) => finish(l))
      .filter((l) => l.total !== 0 || l.comparison !== 0 || Object.values(l.byEntity).some((v) => v !== 0))
      .sort((a, b) => a.code.localeCompare(b.code));
    return { label: this.label, lines, ...finish(this.totals) };
  }
}

export enum DateFilterEnum {
  THIS_YEAR = 'THIS_YEAR',
  THIS_FISCAL_YEAR = 'THIS_FISCAL_YEAR',
  LAST_FISCAL_YEAR = 'LAST_FISCAL_YEAR',
  LAST_12_MONTHS = 'LAST_12_MONTHS',
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class DateFilterDto {
  filter?: DateFilterEnum = DateFilterEnum.THIS_YEAR;
  customFrom?: Date;
  customTo?: Date;
}

/**
 * Helper class to calculate date ranges for various filters
 * Note: Fiscal year is currently a placeholder - should be configured per entity in future
 */
export class DateFilterHelper {
  private static readonly FISCAL_YEAR_START_MONTH = 0; // January (0-indexed) - customize per entity later
  private static readonly FISCAL_YEAR_START_DAY = 1;

  /**
   * Get date range based on filter type
   * @param filter The date filter type
   * @returns DateRange with startDate and endDate
   */
  static getDateRange(filter: DateFilterEnum = DateFilterEnum.THIS_YEAR): DateRange {
    const now = new Date();

    switch (filter) {
      case DateFilterEnum.THIS_YEAR:
        return this.getThisYearRange();

      case DateFilterEnum.THIS_FISCAL_YEAR:
        return this.getThisFiscalYearRange();

      case DateFilterEnum.LAST_FISCAL_YEAR:
        return this.getLastFiscalYearRange();

      case DateFilterEnum.LAST_12_MONTHS:
        return this.getLast12MonthsRange();

      default:
        return this.getThisYearRange();
    }
  }

  /**
   * THIS_YEAR: January 1 to today
   */
  private static getThisYearRange(): DateRange {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);

    return {
      startDate,
      endDate: now,
    };
  }

  /**
   * THIS_FISCAL_YEAR: From fiscal year start to today
   * Currently configured for Calendar Year (Jan 1 - Dec 31)
   * TODO: Make this configurable per entity
   */
  private static getThisFiscalYearRange(): DateRange {
    const now = new Date();
    const fiscalYearStart = new Date(
      now.getFullYear(),
      this.FISCAL_YEAR_START_MONTH,
      this.FISCAL_YEAR_START_DAY,
    );

    // If we haven't reached fiscal year start yet, go back to previous year's start
    if (now < fiscalYearStart) {
      fiscalYearStart.setFullYear(now.getFullYear() - 1);
    }

    fiscalYearStart.setHours(0, 0, 0, 0);

    return {
      startDate: fiscalYearStart,
      endDate: now,
    };
  }

  /**
   * LAST_FISCAL_YEAR: Full fiscal year before current fiscal year
   * TODO: Make this configurable per entity
   */
  private static getLastFiscalYearRange(): DateRange {
    const thisFiscalStart = this.getThisFiscalYearRange().startDate;

    // Last fiscal year ends one day before this fiscal year starts
    const lastFiscalEnd = new Date(thisFiscalStart);
    lastFiscalEnd.setDate(lastFiscalEnd.getDate() - 1);

    // Last fiscal year starts 12 months before this fiscal year starts
    const lastFiscalStart = new Date(thisFiscalStart);
    lastFiscalStart.setFullYear(lastFiscalStart.getFullYear() - 1);

    lastFiscalStart.setHours(0, 0, 0, 0);
    lastFiscalEnd.setHours(23, 59, 59, 999);

    return {
      startDate: lastFiscalStart,
      endDate: lastFiscalEnd,
    };
  }

  /**
   * LAST_12_MONTHS: Last 12 months from today
   */
  private static getLast12MonthsRange(): DateRange {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setHours(0, 0, 0, 0);

    return {
      startDate,
      endDate: now,
    };
  }

  /**
   * Get filter options for API documentation
   */
  static getFilterOptions() {
    return {
      THIS_YEAR: 'January 1 - Today',
      THIS_FISCAL_YEAR: 'Fiscal Year Start (configurable) - Today',
      LAST_FISCAL_YEAR: 'Previous Fiscal Year (full 12 months)',
      LAST_12_MONTHS: '12 months back from today',
    };
  }
}

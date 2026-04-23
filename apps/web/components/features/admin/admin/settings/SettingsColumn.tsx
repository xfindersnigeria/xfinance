export interface FiscalCalendarSetting {
  id: string;
  fiscalYear: string;
  startDate: string;
  endDate: string;
  periods: string[];
}

export interface CurrencySetting {
  id: string;
  baseCurrency: string;
  reportingCurrency: string;
  enabled: boolean;
}

export interface PeriodCloseSetting {
  id: string;
  period: string;
  status: "Open" | "Closed" | "In Review";
  closedDate?: string;
  reviewedBy?: string;
}

export const fiscalCalendarData: FiscalCalendarSetting[] = [
  {
    id: "1",
    fiscalYear: "2025",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    periods: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
  },
];

export const currencySettings: CurrencySetting[] = [
  {
    id: "1",
    baseCurrency: "USD",
    reportingCurrency: "USD",
    enabled: true,
  },
  {
    id: "2",
    baseCurrency: "GBP",
    reportingCurrency: "USD",
    enabled: true,
  },
  {
    id: "3",
    baseCurrency: "EUR",
    reportingCurrency: "USD",
    enabled: true,
  },
];

export const periodCloseData: PeriodCloseSetting[] = [
  {
    id: "1",
    period: "November 2025",
    status: "Closed",
    closedDate: "2025-11-05",
    reviewedBy: "Sarah Chen",
  },
  {
    id: "2",
    period: "October 2025",
    status: "Closed",
    closedDate: "2025-10-06",
    reviewedBy: "Michael Rodriguez",
  },
  {
    id: "3",
    period: "September 2025",
    status: "In Review",
    reviewedBy: "Emma Thompson",
  },
  {
    id: "4",
    period: "August 2025",
    status: "Open",
  },
];

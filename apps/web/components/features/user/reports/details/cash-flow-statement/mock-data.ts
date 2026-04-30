export type CFItemType = 'section' | 'item' | 'label' | 'subtotal' | 'net' | 'cashline';

export interface CFItem {
  id: string;
  label: string;
  actual: number | null;
  comparison: number | null;
  type: CFItemType;
  children?: CFItem[];
  showBadge?: boolean;
}

export interface CFKPIItem {
  label: string;
  value: number;
  previous: number;
  badgeText: string;
  badgeVariant: 'green' | 'orange' | 'purple' | 'blue';
  trendUp: boolean;
}

export const PERIODS = [
  'Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023',
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
];

export const kpiItems: CFKPIItem[] = [
  {
    label: 'Operating Cash Flow',
    value: 419_000,
    previous: 388_000,
    badgeText: '8.0%',
    badgeVariant: 'green',
    trendUp: true,
  },
  {
    label: 'Investing Cash Flow',
    value: -132_000,
    previous: -110_000,
    badgeText: '20.0%',
    badgeVariant: 'orange',
    trendUp: false,
  },
  {
    label: 'Financing Cash Flow',
    value: -12_000,
    previous: 67_000,
    badgeText: '117.9%',
    badgeVariant: 'purple',
    trendUp: false,
  },
  {
    label: 'Net Cash Increase',
    value: 275_000,
    previous: 345_000,
    badgeText: '20.3%',
    badgeVariant: 'blue',
    trendUp: true,
  },
];

export const cfLineItems: CFItem[] = [
  {
    id: 'operating-activities',
    label: 'Operating Activities',
    type: 'section',
    actual: null,
    comparison: null,
    children: [
      { id: 'net-profit', label: 'Net Profit', type: 'item', actual: 400_000, comparison: 360_000 },
      { id: 'adj-label', label: 'Adjustments for:', type: 'label', actual: null, comparison: null },
      { id: 'depreciation', label: 'Depreciation & Amortization', type: 'item', actual: 45_000, comparison: 42_000 },
      { id: 'interest-expense-op', label: 'Interest Expense', type: 'item', actual: 32_000, comparison: 28_000 },
      { id: 'interest-income-op', label: 'Interest Income', type: 'item', actual: -15_000, comparison: -12_000 },
      { id: 'loss-on-sale', label: 'Loss on Sale of Assets', type: 'item', actual: 3_000, comparison: 2_000 },
      { id: 'wc-label', label: 'Changes in Working Capital:', type: 'label', actual: null, comparison: null },
      { id: 'accounts-receivable', label: 'Accounts Receivable', type: 'item', actual: -85_000, comparison: -60_000 },
      { id: 'inventory', label: 'Inventory', type: 'item', actual: -45_000, comparison: -35_000 },
      { id: 'prepaid-expenses', label: 'Prepaid Expenses', type: 'item', actual: -8_000, comparison: -5_000 },
      { id: 'accounts-payable', label: 'Accounts Payable', type: 'item', actual: 55_000, comparison: 40_000 },
      { id: 'accrued-expenses', label: 'Accrued Expenses', type: 'item', actual: 22_000, comparison: 18_000 },
      { id: 'unearned-revenue', label: 'Unearned Revenue', type: 'item', actual: 15_000, comparison: 10_000 },
    ],
  },
  {
    id: 'net-cash-operating',
    label: 'Net Cash from Operating Activities',
    type: 'subtotal',
    actual: 419_000,
    comparison: 388_000,
  },
  {
    id: 'investing-activities',
    label: 'Investing Activities',
    type: 'section',
    actual: null,
    comparison: null,
    children: [
      { id: 'purchase-ppe', label: 'Purchase of Property, Plant & Equipment', type: 'item', actual: -120_000, comparison: -95_000 },
      { id: 'purchase-investments', label: 'Purchase of Investments', type: 'item', actual: -50_000, comparison: -40_000 },
      { id: 'proceeds-equipment', label: 'Proceeds from Sale of Equipment', type: 'item', actual: 15_000, comparison: 8_000 },
      { id: 'interest-received', label: 'Interest Received', type: 'item', actual: 15_000, comparison: 12_000 },
      { id: 'dividends-received', label: 'Dividends Received', type: 'item', actual: 8_000, comparison: 5_000 },
    ],
  },
  {
    id: 'net-cash-investing',
    label: 'Net Cash from Investing Activities',
    type: 'subtotal',
    actual: -132_000,
    comparison: -110_000,
  },
  {
    id: 'financing-activities',
    label: 'Financing Activities',
    type: 'section',
    actual: null,
    comparison: null,
    children: [
      { id: 'proceeds-debt', label: 'Proceeds from Long-term Debt', type: 'item', actual: 150_000, comparison: null },
      { id: 'repayment-debt', label: 'Repayment of Long-term Debt', type: 'item', actual: -50_000, comparison: -45_000 },
      { id: 'proceeds-share', label: 'Proceeds from Share Capital', type: 'item', actual: null, comparison: 200_000 },
      { id: 'dividends-paid', label: 'Dividends Paid', type: 'item', actual: -80_000, comparison: -60_000 },
      { id: 'interest-paid', label: 'Interest Paid', type: 'item', actual: -32_000, comparison: -28_000 },
    ],
  },
  {
    id: 'net-cash-financing',
    label: 'Net Cash from Financing Activities',
    type: 'subtotal',
    actual: -12_000,
    comparison: 67_000,
  },
  {
    id: 'net-increase',
    label: 'Net Increase (Decrease) in Cash',
    type: 'net',
    actual: 275_000,
    comparison: 345_000,
  },
  {
    id: 'cash-beginning',
    label: 'Cash and Cash Equivalents, Beginning of Period',
    type: 'cashline',
    actual: 450_000,
    comparison: 385_000,
    showBadge: false,
  },
  {
    id: 'cash-end',
    label: 'Cash and Cash Equivalents, End of Period',
    type: 'cashline',
    actual: 725_000,
    comparison: 730_000,
    showBadge: true,
  },
];

export function getAllSectionIds(items: CFItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.type === 'section') ids.push(item.id);
  }
  return ids;
}

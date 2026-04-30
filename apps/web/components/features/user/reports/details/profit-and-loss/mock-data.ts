export type PLItemType = 'section' | 'item' | 'subtotal' | 'calculated' | 'net';

export interface PLItem {
  id: string;
  label: string;
  actual: number;
  comparison: number;
  type: PLItemType;
  children?: PLItem[];
  negativeDisplay?: boolean;
}

export interface KPIItem {
  label: string;
  value: number;
  previous: number;
  badgeText: string;
  badgeVariant: 'blue' | 'green' | 'purple';
  showTrendIcon?: boolean;
  valueColor?: string;
}

export const PERIODS = [
  'Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023',
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025',
];

export const kpiItems: KPIItem[] = [
  {
    label: 'Total Revenue',
    value: 2_480_000,
    previous: 2_250_000,
    badgeText: '10.2%',
    badgeVariant: 'blue',
    showTrendIcon: true,
  },
  {
    label: 'Gross Profit',
    value: 1_240_000,
    previous: 1_125_000,
    badgeText: '50.0%',
    badgeVariant: 'green',
  },
  {
    label: 'Operating Profit',
    value: 420_000,
    previous: 380_000,
    badgeText: '16.9%',
    badgeVariant: 'purple',
  },
  {
    label: 'Net Profit',
    value: 400_000,
    previous: 360_000,
    badgeText: '16.1%',
    badgeVariant: 'green',
    valueColor: 'text-green-600',
  },
];

export const plLineItems: PLItem[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    type: 'section',
    actual: 2_480_000,
    comparison: 2_250_000,
    children: [
      { id: 'product-sales', label: 'Product Sales', type: 'item', actual: 1_860_000, comparison: 1_680_000 },
      { id: 'service-revenue', label: 'Service Revenue', type: 'item', actual: 520_000, comparison: 480_000 },
      { id: 'subscription-income', label: 'Subscription Income', type: 'item', actual: 85_000, comparison: 75_000 },
      { id: 'other-revenue', label: 'Other Revenue', type: 'item', actual: 15_000, comparison: 15_000 },
    ],
  },
  {
    id: 'total-revenue',
    label: 'Total Revenue',
    type: 'subtotal',
    actual: 2_480_000,
    comparison: 2_250_000,
  },
  {
    id: 'cogs',
    label: 'Cost of Goods Sold',
    type: 'section',
    actual: 1_240_000,
    comparison: 1_125_000,
    children: [
      { id: 'raw-materials', label: 'Raw Materials', type: 'item', actual: 720_000, comparison: 650_000 },
      { id: 'direct-labor', label: 'Direct Labor', type: 'item', actual: 380_000, comparison: 345_000 },
      { id: 'manufacturing-overhead', label: 'Manufacturing Overhead', type: 'item', actual: 95_000, comparison: 90_000 },
      { id: 'freight-shipping', label: 'Freight & Shipping', type: 'item', actual: 45_000, comparison: 40_000 },
    ],
  },
  {
    id: 'total-cogs',
    label: 'Total Cost of Goods Sold',
    type: 'subtotal',
    actual: 1_240_000,
    comparison: 1_125_000,
    negativeDisplay: true,
  },
  {
    id: 'gross-profit',
    label: 'Gross Profit',
    type: 'calculated',
    actual: 1_240_000,
    comparison: 1_125_000,
  },
  {
    id: 'operating-expenses',
    label: 'Operating Expenses',
    type: 'section',
    actual: 820_000,
    comparison: 745_000,
    children: [
      {
        id: 'salaries-wages',
        label: 'Salaries & Wages',
        type: 'section',
        actual: 450_000,
        comparison: 420_000,
        children: [
          { id: 'management-salaries', label: 'Management Salaries', type: 'item', actual: 180_000, comparison: 170_000 },
          { id: 'staff-salaries', label: 'Staff Salaries', type: 'item', actual: 220_000, comparison: 205_000 },
          { id: 'contract-labor', label: 'Contract Labor', type: 'item', actual: 50_000, comparison: 45_000 },
        ],
      },
      {
        id: 'rent-utilities',
        label: 'Rent & Utilities',
        type: 'section',
        actual: 120_000,
        comparison: 115_000,
        children: [
          { id: 'office-rent', label: 'Office Rent', type: 'item', actual: 85_000, comparison: 85_000 },
          { id: 'utilities', label: 'Utilities', type: 'item', actual: 25_000, comparison: 22_000 },
          { id: 'property-maintenance', label: 'Property Maintenance', type: 'item', actual: 10_000, comparison: 8_000 },
        ],
      },
      {
        id: 'marketing-advertising',
        label: 'Marketing & Advertising',
        type: 'section',
        actual: 180_000,
        comparison: 145_000,
        children: [
          { id: 'digital-marketing', label: 'Digital Marketing', type: 'item', actual: 95_000, comparison: 75_000 },
          { id: 'traditional-advertising', label: 'Traditional Advertising', type: 'item', actual: 55_000, comparison: 45_000 },
          { id: 'marketing-materials', label: 'Marketing Materials', type: 'item', actual: 30_000, comparison: 25_000 },
        ],
      },
      { id: 'professional-fees', label: 'Professional Fees', type: 'item', actual: 35_000, comparison: 32_000 },
      { id: 'insurance', label: 'Insurance', type: 'item', actual: 18_000, comparison: 18_000 },
      { id: 'office-supplies', label: 'Office Supplies', type: 'item', actual: 8_000, comparison: 7_500 },
      { id: 'technology-software', label: 'Technology & Software', type: 'item', actual: 9_000, comparison: 7_500 },
    ],
  },
  {
    id: 'total-opex',
    label: 'Total Operating Expenses',
    type: 'subtotal',
    actual: 820_000,
    comparison: 745_000,
    negativeDisplay: true,
  },
  {
    id: 'operating-profit',
    label: 'Operating Profit (EBIT)',
    type: 'calculated',
    actual: 420_000,
    comparison: 380_000,
  },
  {
    id: 'other-income',
    label: 'Other Income',
    type: 'section',
    actual: 25_000,
    comparison: 18_000,
    children: [
      { id: 'interest-income', label: 'Interest Income', type: 'item', actual: 15_000, comparison: 12_000 },
      { id: 'investment-income', label: 'Investment Income', type: 'item', actual: 8_000, comparison: 5_000 },
      { id: 'fx-gain', label: 'Foreign Exchange Gain', type: 'item', actual: 2_000, comparison: 1_000 },
    ],
  },
  {
    id: 'other-expenses',
    label: 'Other Expenses',
    type: 'section',
    actual: 45_000,
    comparison: 38_000,
    children: [
      { id: 'interest-expense', label: 'Interest Expense', type: 'item', actual: 32_000, comparison: 28_000 },
      { id: 'bank-charges', label: 'Bank Charges', type: 'item', actual: 5_000, comparison: 4_500 },
      { id: 'depreciation', label: 'Depreciation', type: 'item', actual: 8_000, comparison: 5_500 },
    ],
  },
  {
    id: 'net-profit',
    label: 'Net Profit (Loss)',
    type: 'net',
    actual: 400_000,
    comparison: 360_000,
  },
];

export function getAllSectionIds(items: PLItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.type === 'section') {
      ids.push(item.id);
      if (item.children) ids.push(...getAllSectionIds(item.children));
    }
  }
  return ids;
}

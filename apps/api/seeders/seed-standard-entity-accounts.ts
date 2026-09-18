import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * The client's standard chart of accounts on top of the default one-per-
 * subcategory accounts (`{subCategory}-01`). Each account lives under the
 * subcategory given by the first four digits of its code, which must exist in
 * the group's chart (seed-account-chart.ts — 5280 was added for these).
 */
export const STANDARD_ENTITY_ACCOUNTS: Array<{ code: string; name: string; description: string }> = [
  // Assets
  { code: '1210-02', name: 'Building', description: 'Office Building' },
  { code: '1220-02', name: 'Office Equipment', description: 'Office Equipment' },
  // Liabilities
  { code: '2110-02', name: 'Creditors', description: 'Trade Payables' },
  { code: '2110-03', name: 'Accrued Liabilities', description: 'Accrued Liabilities' },
  { code: '2140-02', name: 'CIT Expense', description: 'CIT Expense' },
  { code: '2140-03', name: 'Development Levy', description: 'Development level @4%' },
  // Equity
  { code: '3110-02', name: 'Ordinary Share Capital', description: "This shows the Owner's portion and stake of a company" },
  { code: '3110-03', name: 'share premium', description: 'share premium' },
  { code: '3140-02', name: "Director's Account", description: "Director's capital injections into the Business" },
  // Revenue
  { code: '4120-02', name: 'Revenue', description: 'Revenue' },
  // Cost of goods sold
  { code: '5110-02', name: 'Cost of Sales (Direct Cost)', description: 'Direct Expenses' },
  { code: '5110-03', name: 'Contracts processing Expense', description: 'Contracts processing Expense' },
  // Operating expenses — staff
  { code: '5210-02', name: 'Staff Welfare & Overtime', description: 'Staff Welfare & Overtime' },
  { code: '5210-03', name: 'Payee Expense', description: 'Payee Expense' },
  { code: '5210-04', name: 'Pension Expense', description: 'Pension Expense' },
  { code: '5210-05', name: 'Staff Leave Allowance', description: 'Staff Leave Allowance' },
  // Operating expenses — office, depreciation
  { code: '5240-02', name: 'Printing & Stationaries', description: 'Administrative Expenses' },
  { code: '5260-02', name: 'Depreciation & Ammortization', description: 'Depreciation & Ammortization' },
  // Operating expenses — general & administrative
  { code: '5280-01', name: 'Audit Fees', description: 'Professional Audit Fees' },
  { code: '5280-02', name: 'Transportation & Logistics', description: 'Transportation & Logistics' },
  { code: '5280-03', name: 'Medical Expenses', description: 'Medical Expenses' },
  { code: '5280-04', name: 'Publication & Licensing', description: 'Publication & Licensing' },
  { code: '5280-05', name: 'Tender/ Bidding Expenses', description: 'Tender/ Bidding Expenses' },
  { code: '5280-06', name: 'Motor Vehicle Expenses', description: 'Motor Vehicle Expenses' },
  { code: '5280-07', name: 'Office Building Repairs & Maintenance', description: 'Repairs & Maintenance' },
  { code: '5280-08', name: 'Repairs & Maintenance of Equipments', description: 'Repairs & Maintenance' },
  { code: '5280-09', name: 'Repairs & Maintenance of Furniture & Fittings', description: 'Repairs & Maintenance' },
  { code: '5280-10', name: 'Staff Training Expense', description: 'Staff Training Expense' },
  { code: '5280-11', name: 'Consultancy Expense', description: 'consultancy Services rendered' },
  { code: '5280-12', name: 'Travels & Accomodation Expense', description: 'Travels & Accomodation' },
  { code: '5280-13', name: 'Legal Fees', description: 'Legal Fees' },
  { code: '5280-14', name: 'Office Refreshment & Consumables', description: 'Office Refreshment & Consumables Expense' },
  { code: '5280-15', name: 'Internet Subscription', description: 'Internet Subscription' },
  { code: '5280-16', name: 'IT Expense', description: 'IT Expense' },
  { code: '5280-17', name: 'Telephone Expense', description: 'Telephone Expense' },
  { code: '5280-18', name: 'NSITF', description: 'National Social insurance trust fund' },
  { code: '5280-19', name: 'ITF', description: 'Industrial Trust Fund' },
  { code: '5280-20', name: 'Plant & Generator Repairs & Maintenance', description: 'Plant & Generator Repairs & Maintenance' },
  { code: '5280-21', name: 'Office Equipment Maintenance & Repairs', description: 'Office Equipment Maintenance & Repairs' },
  { code: '5280-22', name: 'Furniture & Fittings Maintenance & Repairs', description: 'Furniture & Fittings Maintenance & Repairs' },
  { code: '5280-23', name: 'Fueling & Diesel Expense', description: 'Fueling & Diesel Expense' },
  // Other expenses
  { code: '5330-02', name: 'Withholding Tax', description: 'Expense' },
  { code: '5330-03', name: 'VAT Expense', description: 'Expense' },
  { code: '5330-04', name: 'Bank Charges', description: 'Bank Charges' },
];

/**
 * Creates the standard accounts for an entity. An account is skipped when the
 * entity already has that code, or already has an account with the same name
 * (e.g. one an admin created by hand under another code) — so re-running, or
 * running on entities that already set these up, never duplicates anything.
 */
async function seedStandardEntityAccounts(entityId: string, groupId: string) {
  const [subCategories, existing] = await Promise.all([
    prisma.accountSubCategory.findMany({
      where: { category: { groupId } },
      select: { id: true, code: true },
    }),
    prisma.account.findMany({
      where: { entityId },
      select: { code: true, name: true },
    }),
  ]);
  const subByCode = new Map(subCategories.map((s) => [s.code, s.id]));
  const codes = new Set(existing.map((a) => a.code));
  const names = new Set(existing.map((a) => a.name.trim().toLowerCase()));

  let created = 0;
  let skipped = 0;
  for (const acc of STANDARD_ENTITY_ACCOUNTS) {
    if (codes.has(acc.code) || names.has(acc.name.trim().toLowerCase())) {
      skipped++;
      continue;
    }
    const subCategoryId = subByCode.get(acc.code.slice(0, 4));
    if (!subCategoryId) {
      console.warn(`  ⚠ Subcategory ${acc.code.slice(0, 4)} missing for group ${groupId} — ${acc.code} ${acc.name} skipped`);
      skipped++;
      continue;
    }
    try {
      await prisma.account.create({
        data: { ...acc, subCategoryId, entityId, groupId, balance: 0 },
      });
      codes.add(acc.code);
      created++;
    } catch (error) {
      // Unique (entityId, code) — created concurrently; nothing to do
      if ((error as any)?.code === 'P2002') {
        skipped++;
        continue;
      }
      throw error;
    }
  }
  console.log(`  ✓ Standard accounts: created ${created}, skipped ${skipped} (already present)`);
}

export { seedStandardEntityAccounts };

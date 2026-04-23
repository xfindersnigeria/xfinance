import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Default chart of accounts structure for groups
 * Organized by Type -> Category -> SubCategory
 */
const defaultChartOfAccounts = {
  '1000': {
    // Assets
    name: 'Assets',
    categories: [
      {
        code: '1100',
        name: 'Current Assets',
        description: 'Short-term assets expected to be converted to cash within a year',
        subCategories: [
          { code: '1110', name: 'Cash and Cash Equivalents', description: 'Physical cash and bank deposits' },
          { code: '1120', name: 'Accounts Receivable', description: 'Money owed by customers' },
          { code: '1130', name: 'Inventory', description: 'Goods held for sale' },
          { code: '1140', name: 'Prepaid Expenses', description: 'Expenses paid in advance' },
          { code: '1150', name: 'Short-term Investments', description: 'Investments due within a year' },
        ],
      },
      {
        code: '1200',
        name: 'Fixed Assets',
        description: 'Long-term tangible assets used in operations',
        subCategories: [
          { code: '1210', name: 'Property, Plant & Equipment', description: 'Buildings and land' },
          { code: '1220', name: 'Machinery & Equipment', description: 'Production machinery and tools' },
          { code: '1230', name: 'Vehicles', description: 'Company vehicles' },
          { code: '1240', name: 'Furniture & Fixtures', description: 'Office furniture and fixtures' },
          { code: '1250', name: 'Accumulated Depreciation', description: 'Depreciation on fixed assets' },
        ],
      },
      {
        code: '1300',
        name: 'Intangible Assets',
        description: 'Non-physical assets with value',
        subCategories: [
          { code: '1310', name: 'Goodwill', description: 'Premium paid for acquisitions' },
          { code: '1320', name: 'Patents & Trademarks', description: 'Intellectual property' },
          { code: '1330', name: 'Software & Licenses', description: 'Software licenses and digital assets' },
        ],
      },
    ],
  },
  '2000': {
    // Liabilities
    name: 'Liabilities',
    categories: [
      {
        code: '2100',
        name: 'Current Liabilities',
        description: 'Debts due within one year',
        subCategories: [
          { code: '2110', name: 'Accounts Payable', description: 'Money owed to suppliers' },
          { code: '2120', name: 'Wages Payable', description: 'Salaries owed to employees' },
          { code: '2130', name: 'Short-term Debt', description: 'Loans due within one year' },
          { code: '2140', name: 'Income Tax Payable', description: 'Taxes owed to government' },
          { code: '2150', name: 'Deferred Revenue', description: 'Money received in advance' },
        ],
      },
      {
        code: '2200',
        name: 'Long-term Liabilities',
        description: 'Debts due after one year',
        subCategories: [
          { code: '2210', name: 'Long-term Debt', description: 'Loans due after one year' },
          { code: '2220', name: 'Bonds Payable', description: 'Issued bonds and notes' },
          { code: '2230', name: 'Deferred Tax Liabilities', description: 'Future tax obligations' },
        ],
      },
    ],
  },
  '3000': {
    // Equity
    name: 'Equity',
    categories: [
      {
        code: '3100',
        name: 'Shareholders Equity',
        description: 'Owner investments and retained earnings',
        subCategories: [
          { code: '3110', name: 'Capital Stock', description: 'Owner share capital' },
          { code: '3120', name: 'Retained Earnings', description: 'Accumulated profits' },
          { code: '3130', name: 'Dividends', description: 'Distributions to shareholders' },
          { code: '3140', name: 'Opening Balance', description: 'Opening balances brought forward' },
        ],
      },
    ],
  },
  '4000': {
    // Revenue
    name: 'Revenue',
    categories: [
      {
        code: '4100',
        name: 'Operating Revenue',
        description: 'Primary revenue from business operations',
        subCategories: [
          { code: '4110', name: 'Product Sales Revenue', description: 'Revenue from selling products' },
          { code: '4120', name: 'Service Revenue', description: 'Revenue from providing services' },
          { code: '4130', name: 'Rental Income', description: 'Revenue from renting assets' },
        ],
      },
      {
        code: '4200',
        name: 'Other Income',
        description: 'Non-operating income',
        subCategories: [
          { code: '4210', name: 'Interest Income', description: 'Income from investments' },
          { code: '4220', name: 'Gain on Sale of Assets', description: 'Profit from selling assets' },
          { code: '4230', name: 'Miscellaneous Income', description: 'Other income sources' },
        ],
      },
    ],
  },
  '5000': {
    // Expenses
    name: 'Expenses',
    categories: [
      {
        code: '5100',
        name: 'Cost of Goods Sold',
        description: 'Direct costs of producing products',
        subCategories: [
          { code: '5110', name: 'Raw Materials', description: 'Materials used in production' },
          { code: '5120', name: 'Direct Labor', description: 'Production worker wages' },
          { code: '5130', name: 'Manufacturing Overhead', description: 'Factory overhead costs' },
        ],
      },
      {
        code: '5200',
        name: 'Operating Expenses',
        description: 'General business operating costs',
        subCategories: [
          { code: '5210', name: 'Salaries & Wages', description: 'Employee compensation' },
          { code: '5220', name: 'Rent Expense', description: 'Building and facility rent' },
          { code: '5230', name: 'Utilities', description: 'Electricity, water, gas' },
          { code: '5240', name: 'Office Supplies', description: 'General office supplies' },
          { code: '5250', name: 'Marketing & Advertising', description: 'Promotional expenses' },
          { code: '5260', name: 'Depreciation Expense', description: 'Depreciation charges' },
          { code: '5270', name: 'Insurance Expense', description: 'Insurance premiums' },
        ],
      },
      {
        code: '5300',
        name: 'Other Expenses',
        description: 'Non-operating expenses',
        subCategories: [
          { code: '5310', name: 'Interest Expense', description: 'Interest on debt' },
          { code: '5320', name: 'Loss on Sale of Assets', description: 'Loss from selling assets' },
          { code: '5330', name: 'Taxes & Licenses', description: 'Business taxes and licenses' },
        ],
      },
    ],
  },
};

async function seedDefaultChartOfAccounts(groupId: string) {
  try {
    console.log(`Seeding default chart of accounts for group: ${groupId}`);

    for (const [typeCode, typeData] of Object.entries(defaultChartOfAccounts)) {
      // Get the account type
      const type = await prisma.accountType.findUnique({
        where: { code: typeCode },
      });

      if (!type) {
        console.warn(`⚠ AccountType not found: ${typeCode}`);
        continue;
      }

      // Create categories
      for (const categoryData of typeData.categories) {
        const category = await prisma.accountCategory.findFirst({
          where: {
            code: categoryData.code,
            groupId,
          },
        });

        if (!category) {
          const newCategory = await prisma.accountCategory.create({
            data: {
              code: categoryData.code,
              name: categoryData.name,
              description: categoryData.description,
              typeId: type.id,
              groupId,
            },
          });
          console.log(
            `  ✓ Created category: ${categoryData.name} (${categoryData.code})`,
          );

          // Create subcategories
          for (const subcategoryData of categoryData.subCategories) {
            const subCategory = await prisma.accountSubCategory.findFirst({
              where: {
                code: subcategoryData.code,
                categoryId: newCategory.id,
              },
            });

            if (!subCategory) {
              await prisma.accountSubCategory.create({
                data: {
                  code: subcategoryData.code,
                  name: subcategoryData.name,
                  description: subcategoryData.description,
                  categoryId: newCategory.id,
                  groupId: newCategory.groupId,
                },
              });
              console.log(
                `    ✓ Created subcategory: ${subcategoryData.name} (${subcategoryData.code})`,
              );
            }
          }
        } else {
          console.log(
            `  • Category already exists: ${categoryData.name}`,
          );
        }
      }
    }

    console.log(`✓ Default chart of accounts seeded for group: ${groupId}\n`);
  } catch (error) {
    console.error('Error seeding default chart of accounts:', error);
    throw error;
  }
}

export { seedDefaultChartOfAccounts };

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function updateModulesMenu() {
  try {
    console.log('Updating module menu categories...\n');

    // Define all modules with their menu categories
    const modulesWithMenus = [
      // USER-level entity modules (business operations)
      // Income
      { key: 'customers', menu: 'Income' },
      { key: 'items', menu: 'Income' },
      { key: 'invoices', menu: 'Income' },
      { key: 'paymentReceived', menu: 'Income' },
      { key: 'salesReceipt', menu: 'Income' },
      // Projects
      { key: 'projects', menu: 'Projects' },
      // Expense
      { key: 'vendors', menu: 'Expense' },
      { key: 'expenses', menu: 'Expense' },
      { key: 'bills', menu: 'Expense' },
      { key: 'paymentMade', menu: 'Expense' },
      // Products
      { key: 'storeItems', menu: 'Products' },
      { key: 'collections', menu: 'Products' },
      { key: 'orders', menu: 'Products' },
      // Assets & Inventory
      { key: 'fixedAssets', menu: 'Assets & Inventory' },
      { key: 'inventory', menu: 'Assets & Inventory' },
      // Accounts
      { key: 'chartOfAccounts', menu: 'Accounts' },
      { key: 'openingBalance', menu: 'Accounts' },
      { key: 'manualJournal', menu: 'Accounts' },
      // Banking
      { key: 'banking', menu: 'Banking' },
      // HR & Payroll
      { key: 'employees', menu: 'HR & Payroll' },
      { key: 'attendance', menu: 'HR & Payroll' },
      { key: 'payroll', menu: 'HR & Payroll' },
      { key: 'manageLeave', menu: 'HR & Payroll' },
      // Reports
      { key: 'reports', menu: 'Reports' },
      // Entity Settings
      { key: 'settings', menu: 'Settings' },

      // ADMIN-level modules (group administration)
      // Overview
      { key: 'overview', menu: 'Overview' },
      // Intercompany
      { key: 'intercompany', menu: 'Intercompany' },
      // Group Reports
      { key: 'groupReports', menu: 'Group Reports' },
      // Budgeting & Forecasts
      { key: 'budgetOverview', menu: 'Budgeting & Forecasts' },
      { key: 'forecast', menu: 'Budgeting & Forecasts' },
      // Master Chart of Accounts
      { key: 'masterChartOfAccounts', menu: 'Master Chart of Accounts' },
      // Admin
      { key: 'entities', menu: 'Admin' },
      { key: 'users', menu: 'Admin' },
      { key: 'auditTrail', menu: 'Admin' },
      { key: 'integrations', menu: 'Admin' },
      { key: 'groupSettings', menu: 'Admin' },
    ];

    let updated = 0;
    let notFound = 0;

    for (const { key, menu } of modulesWithMenus) {
      const existingModule = await prisma.module.findFirst({
        where: { moduleKey: key },
      });

      if (existingModule) {
        await prisma.module.update({
          where: { id: existingModule.id },
          data: { menu },
        });
        console.log(`✓ Updated "${key}" → menu: "${menu}"`);
        updated++;
      } else {
        console.log(`✗ Module not found: "${key}"`);
        notFound++;
      }
    }

    console.log(`\n✅ Update completed!`);
    console.log(`   ✓ Updated: ${updated}`);
    console.log(`   ✗ Not found: ${notFound}`);
  } catch (error) {
    console.error('Error updating modules menu:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔄 Starting modules menu update...\n');
    await updateModulesMenu();
    console.log('✅ Modules menu update completed successfully');
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

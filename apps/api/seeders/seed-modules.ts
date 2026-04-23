import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';
import { ModuleScope, PermissionAction } from '../prisma/generated/enums';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function seedModules() {
  try {
    console.log('Seeding modules and actions...');

    // Define all modules with scope (ADMIN or USER)
    const modules = [
      // USER-level entity modules (business operations)
      { key: 'entityDashboard', name: 'Dashboard', menu: 'Dashboard', scope: 'user', menuSortOrder: 0, moduleSortOrder: 0 },

      // Income
      { key: 'customers', name: 'Customers', menu: 'Income', scope: 'user', menuSortOrder: 1, moduleSortOrder: 0 },
      { key: 'items', name: 'Items', menu: 'Income', scope: 'user', menuSortOrder: 1, moduleSortOrder: 1 },
      { key: 'invoices', name: 'Invoices', menu: 'Income', scope: 'user', menuSortOrder: 1, moduleSortOrder: 2 },
      { key: 'paymentReceived', name: 'Payment Received', menu: 'Income', scope: 'user', menuSortOrder: 1, moduleSortOrder: 3 },
      { key: 'salesReceipt', name: 'Sales Receipt', menu: 'Income', scope: 'user', menuSortOrder: 1, moduleSortOrder: 4 },
      // Projects
      { key: 'projects', name: 'Projects', menu: 'Projects', scope: 'user', menuSortOrder: 2, moduleSortOrder: 0 },
      // Expense
      { key: 'vendors', name: 'Vendors', menu: 'Expense', scope: 'user', menuSortOrder: 3, moduleSortOrder: 0 },
      { key: 'expenses', name: 'Expenses', menu: 'Expense', scope: 'user', menuSortOrder: 3, moduleSortOrder: 1 },
      { key: 'bills', name: 'Bills', menu: 'Expense', scope: 'user', menuSortOrder: 3, moduleSortOrder: 2 },
      { key: 'paymentMade', name: 'Payment Made', menu: 'Expense', scope: 'user', menuSortOrder: 3, moduleSortOrder: 3 },
      // Products
      { key: 'storeItems', name: 'Store Items', menu: 'Products', scope: 'user', menuSortOrder: 4, moduleSortOrder: 0 },
      { key: 'collections', name: 'Collections', menu: 'Products', scope: 'user', menuSortOrder: 4, moduleSortOrder: 1 },
      { key: 'productsInventory', name: 'Inventory', menu: 'Products', scope: 'user', menuSortOrder: 4, moduleSortOrder: 2 },

      { key: 'orders', name: 'Orders', menu: 'Products', scope: 'user', menuSortOrder: 4, moduleSortOrder: 3 },
      // Assets & Inventory
      { key: 'fixedAssets', name: 'Fixed Assets', menu: 'Assets & Inventory', scope: 'user', menuSortOrder: 5, moduleSortOrder: 0 },
      { key: 'inventory', name: 'Inventory', menu: 'Assets & Inventory', scope: 'user', menuSortOrder: 5, moduleSortOrder: 1 },
      // Accounts
      { key: 'chartOfAccounts', name: 'Chart of Accounts', menu: 'Accounts', scope: 'user', menuSortOrder: 6, moduleSortOrder: 0 },
      { key: 'openingBalance', name: 'Opening Balance', menu: 'Accounts', scope: 'user', menuSortOrder: 6, moduleSortOrder: 1 },
      { key: 'manualJournal', name: 'Manual Journal', menu: 'Accounts', scope: 'user', menuSortOrder: 6, moduleSortOrder: 2 },
      { key: 'budget', name: 'Budget', menu: 'Accounts', scope: 'user', menuSortOrder: 6, moduleSortOrder: 3 },
      // Banking
      { key: 'banking', name: 'Banking', menu: 'Banking', scope: 'user', menuSortOrder: 7, moduleSortOrder: 0 },
      // HR & Payroll
      { key: 'employees', name: 'Employees', menu: 'HR & Payroll', scope: 'user', menuSortOrder: 8, moduleSortOrder: 0 },
      { key: 'attendance', name: 'Attendance', menu: 'HR & Payroll', scope: 'user', menuSortOrder: 8, moduleSortOrder: 1 },
      { key: 'payroll', name: 'Payroll', menu: 'HR & Payroll', scope: 'user', menuSortOrder: 8, moduleSortOrder: 2 },
      { key: 'manageLeave', name: 'Manage Leave', menu: 'HR & Payroll', scope: 'user', menuSortOrder: 8, moduleSortOrder: 3 },
      // Reports
      { key: 'reports', name: 'Reports', menu: 'Reports', scope: 'user', menuSortOrder: 9, moduleSortOrder: 0 },
      // Entity Settings
      { key: 'entitySettings', name: 'Settings', menu: 'Settings', scope: 'user', menuSortOrder: 10, moduleSortOrder: 0 },

      // ADMIN-level modules (group administration)
      // Overview
      { key: 'groupDashboard', name: 'Overview', menu: 'Dashboard', scope: 'admin', menuSortOrder: 0, moduleSortOrder: 0 },
      // Intercompany
      { key: 'intercompany', name: 'Intercompany', menu: 'Intercompany', scope: 'admin', menuSortOrder: 1, moduleSortOrder: 0 },
      // Group Reports
      { key: 'groupReports', name: 'Group Reports', menu: 'Group Reports', scope: 'admin', menuSortOrder: 2, moduleSortOrder: 0 },
      // Budgeting & Forecasts
      { key: 'budgetOverview', name: 'Budget Overview', menu: 'Budgeting & Forecasts', scope: 'admin', menuSortOrder: 3, moduleSortOrder: 0 },
      { key: 'forecast', name: 'Forecast', menu: 'Budgeting & Forecasts', scope: 'admin', menuSortOrder: 3, moduleSortOrder: 1 },
      // Master Chart of Accounts
      { key: 'masterChartOfAccounts', name: 'Master Chart of Accounts', menu: 'Master Chart of Accounts', scope: 'admin', menuSortOrder: 4, moduleSortOrder: 0 },
      // Admin
      { key: 'entities', name: 'Entities', menu: 'Admin', scope: 'admin', menuSortOrder: 5, moduleSortOrder: 0 },
      { key: 'users', name: 'Users & Roles', menu: 'Admin', scope: 'admin', menuSortOrder: 5, moduleSortOrder: 1 },
      { key: 'auditTrail', name: 'Audit Trail', menu: 'Admin', scope: 'admin', menuSortOrder: 5, moduleSortOrder: 2 },
      { key: 'integrations', name: 'Integrations', menu: 'Admin', scope: 'admin', menuSortOrder: 5, moduleSortOrder: 3 },
      { key: 'groupSettings', name: 'Group Settings', menu: 'Admin', scope: 'admin', menuSortOrder: 5, moduleSortOrder: 4 },
      { key: 'groupCustomization', name: 'Customization', menu: 'Admin', scope: 'admin', menuSortOrder: 5, moduleSortOrder: 5 },

      // Superadmin modules
      { key: 'superadminDashboard', name: 'Dashboard', menu: 'Dashboard', scope: 'superadmin', menuSortOrder: 0, moduleSortOrder: 0 },
      { key: 'companies', name: 'Companies', menu: 'Companies', scope: 'superadmin', menuSortOrder: 1, moduleSortOrder: 0 },
      { key: 'subscriptions', name: 'Subscriptions', menu: 'Subscriptions', scope: 'superadmin', menuSortOrder: 2, moduleSortOrder: 0 },
    ];

    // All actions
    const actions = [
      PermissionAction.View,
      PermissionAction.Create,
      PermissionAction.Edit,
      PermissionAction.Delete,
      PermissionAction.Approve,
      PermissionAction.Export,
      PermissionAction.Import,
    ];

    // Seed modules and their actions
    for (const module of modules) {
      const moduleScope = module.scope.toUpperCase() === 'USER' ? ModuleScope.ENTITY : module.scope.toUpperCase() === 'SUPERADMIN' ? ModuleScope.SUPERADMIN : ModuleScope.GROUP;
      
      let createdModule = await prisma.module.findFirst({
        where: { 
          moduleKey: module.key,
          scope: moduleScope,
        },
      });

      if (!createdModule) {
        createdModule = await prisma.module.create({
          data: {
            moduleKey: module.key,
            displayName: module.name,
            menu: module.menu,
            menuSortOrder: module.menuSortOrder,
            moduleSortOrder: module.moduleSortOrder,
            scope: moduleScope,
            ...(module.scope !== 'superadmin' && {
              actions: {
                create: actions.map((action) => ({
                  actionName: action,
                })),
              },
            }),
          },
        });
        console.log(`✓ Created module: ${module.name} [${module.scope.toUpperCase()}]`);
      } else {
        console.log(`✓ Module already exists: ${module.name}`);
      }
    }

    console.log('✓ Modules and actions seeding complete!');
  } catch (error) {
    console.error('Error seeding modules:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🌱 Starting modules seed...\n');
    await seedModules();
    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();



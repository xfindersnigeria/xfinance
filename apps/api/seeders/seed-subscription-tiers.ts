import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Seed subscription tiers with real modules from the module database
 * Maps 3 tiers to actual system modules
 */
async function main() {
  console.log('🌱 Seeding subscription tiers...');

  try {
    // 1. Get all modules
    const modules = await prisma.module.findMany();

    if (modules.length === 0) {
      throw new Error('❌ No modules found. Run seed-modules.ts first!');
    }

    console.log(`✅ Found ${modules.length} modules in database`);

    // 2. Create lookup for module IDs by key
    const moduleLookup: Record<string, string> = {};
    modules.forEach((m) => {
      moduleLookup[m.moduleKey] = m.id;
    });

    // 3. Define tiers with their module allocations
    const tierConfigs = [
      {
        name: 'Free',
        description:
          'Complete accounting system for independent professionals',
        maxUsers: 3,
        maxEntities: 1,
        maxTransactionsMonth: 100,
        maxStorageGB: 5,
        maxApiRatePerHour: 100,
        apiAccess: false,
        webhooks: false,
        sso: false,
        customBranding: false,
        prioritySupport: false,
        modules: [
          // Core accounting
          'entityDashboard',
          'chartOfAccounts',
          'openingBalance',
          'reports',
          'entitySettings',
          // Income
          'customers',
          'invoices',
          'paymentReceived',
          // Expenses
          'vendors',
          'expenses',
          'bills',
        ],
      },
      {
        name: 'Starter',
        description:
          'Full accounting suite with inventory & HR for growing businesses',
        maxUsers: 10,
        maxEntities: 3,
        maxTransactionsMonth: 1000,
        maxStorageGB: 100,
        maxApiRatePerHour: 1000,
        apiAccess: true,
        webhooks: false,
        sso: false,
        customBranding: false,
        prioritySupport: false,
        modules: [
          // All entity modules
          // Income
          'entityDashboard',
          'customers',
          'items',
          'invoices',
          'paymentReceived',
          'salesReceipt',
          // Projects
          'projects',
          // Expenses
          'vendors',
          'expenses',
          'bills',
          'paymentMade',
          // Products
          'storeItems',
          'collections',
          'productsInventory',
          'orders',
          'inventory',
          'fixedAssets',
          // Accounting
          'chartOfAccounts',
          'openingBalance',
          'manualJournal',
          'budget',
          // Banking
          'banking',
          // HR & Payroll
          'employees',
          'attendance',
          'payroll',
          'manageLeave',
          // Reports
          'reports',
          'entitySettings',
          // Group admin modules (limited)
          'groupDashboard',
          'groupReports',
          'entities',
          'users',
          'groupSettings',
        ],
      },
      {
        name: 'Professional',
        description:
          'Enterprise-grade with unlimited entities, consolidation, and advanced features',
        maxUsers: 50,
        maxEntities: 999, // Effectively unlimited
        maxTransactionsMonth: 999999, // Effectively unlimited
        maxStorageGB: 500,
        maxApiRatePerHour: 10000,
        apiAccess: true,
        webhooks: true,
        sso: true,
        customBranding: true,
        prioritySupport: true,
        modules: [
          // All entity modules (25)
          'entityDashboard',
          'customers',
          'items',
          'invoices',
          'paymentReceived',
          'salesReceipt',
          'projects',
          'vendors',
          'expenses',
          'bills',
          'paymentMade',
          'storeItems',
          'productsInventory',
          'collections',
          'orders',
          'inventory',
          'fixedAssets',
          'chartOfAccounts',
          'openingBalance',
          'manualJournal',
          'budget',
          'banking',
          'employees',
          'attendance',
          'payroll',
          'manageLeave',
          'reports',
          'entitySettings',
          // All group admin modules (17)
          'groupDashboard',
          'groupReports',
          'intercompany',
          'budgetOverview',
          'forecast',
          'masterChartOfAccounts',
          'entities',
          'users',
          'auditTrail',
          'integrations',
          'groupSettings',
        ],
      },
    ];

    // 4. Create or update tiers
    for (const tierConfig of tierConfigs) {
      const tier = await prisma.subscriptionTier.upsert({
        where: { name: tierConfig.name },
        create: {
          name: tierConfig.name,
          description: tierConfig.description,
          maxUsers: tierConfig.maxUsers,
          maxEntities: tierConfig.maxEntities,
          maxTransactionsMonth: tierConfig.maxTransactionsMonth,
          maxStorageGB: tierConfig.maxStorageGB,
          maxApiRatePerHour: tierConfig.maxApiRatePerHour,
          apiAccess: tierConfig.apiAccess,
          webhooks: tierConfig.webhooks,
          sso: tierConfig.sso,
          customBranding: tierConfig.customBranding,
          prioritySupport: tierConfig.prioritySupport,
        },
        update: {
          description: tierConfig.description,
          maxUsers: tierConfig.maxUsers,
          maxEntities: tierConfig.maxEntities,
          maxTransactionsMonth: tierConfig.maxTransactionsMonth,
          maxStorageGB: tierConfig.maxStorageGB,
          maxApiRatePerHour: tierConfig.maxApiRatePerHour,
          apiAccess: tierConfig.apiAccess,
          webhooks: tierConfig.webhooks,
          sso: tierConfig.sso,
          customBranding: tierConfig.customBranding,
          prioritySupport: tierConfig.prioritySupport,
        },
      });

      // 5. Clear existing module mappings for this tier
      await prisma.subscriptionModule.deleteMany({
        where: { subscriptionTierId: tier.id },
      });

      // 6. Create module mappings
      const subscriptionModuleData = tierConfig.modules
        .map((moduleKey) => {
          const moduleId = moduleLookup[moduleKey];
          if (!moduleId) {
            console.warn(`⚠️  Module not found: ${moduleKey}`);
            return null;
          }
          return {
            subscriptionTierId: tier.id,
            moduleId,
          };
        })
        .filter((d) => d !== null);

      if (subscriptionModuleData.length > 0) {
        await prisma.subscriptionModule.createMany({
          data: subscriptionModuleData,
        });
      }

      console.log(
        `✅ ${tier.name} tier: ${subscriptionModuleData.length} modules assigned`
      );
    }

    console.log('✅ Subscription tiers seeded successfully!');
    console.log('📊 Summary:');
    console.log('   - Free: Up to 3 users, 1 entity, 10 modules');
    console.log('   - Starter: Up to 10 users, 3 entities, 35 modules');
    console.log('   - Professional: Up to 50 users, unlimited entities, 50 modules');
  } catch (error) {
    console.error('❌ Error seeding subscription tiers:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Generate permissions.json from database
 * Fetches all modules and their actions, generates permission strings
 * Writes to seeders/generated-permissions.json
 */
async function generatePermissions() {
  try {
    console.log('🔍 Fetching all modules and actions from database...');

    // Fetch all modules with their actions
    const modules = await prisma.module.findMany({
      include: {
        actions: {
          select: {
            actionName: true,
          },
        },
      },
      orderBy: {
        moduleKey: 'asc',
      },
    });

    if (modules.length === 0) {
      console.warn('⚠️  No modules found in database');
      return;
    }

    console.log(`✓ Found ${modules.length} modules`);

    // Generate permission strings
    const permissions: string[] = [];

    for (const module of modules) {
      // For modules with actions (not superadmin modules without actions)
      if (module.actions && module.actions.length > 0) {
        for (const action of module.actions) {
          const permission = `${module.moduleKey}:${action.actionName.toLowerCase()}`;
          permissions.push(permission);
        }
      } else {
        // Fallback for modules without actions (shouldn't happen, but handle gracefully)
        const permission = `${module.moduleKey}:view`;
        permissions.push(permission);
      }
    }

    // Sort permissions alphabetically for consistency
    permissions.sort();

    console.log(`✓ Generated ${permissions.length} permissions`);

    // Write to file
    const filePath = path.join(__dirname, 'generated-permissions.json');
    fs.writeFileSync(filePath, JSON.stringify(permissions, null, 2));

    console.log(`✓ Wrote permissions to: ${filePath}`);
    console.log('\n📄 Sample permissions:');
    permissions.slice(0, 5).forEach((perm) => console.log(`   - ${perm}`));
    console.log(`   ... (${permissions.length} total)`);

    return permissions;
  } catch (error) {
    console.error('❌ Error generating permissions:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🌱 Starting permission generation seed...\n');
    await generatePermissions();
    console.log('\n✅ Permission generation completed successfully');
  } catch (error) {
    console.error('❌ Permission generation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

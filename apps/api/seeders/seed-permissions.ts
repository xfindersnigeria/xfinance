import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });


  async function seed() {
    console.log('Seeding permissions (module + action combinations)...');

    try {
      // Fetch all modules with their actions
      const modules = await prisma.module.findMany({
        include: {
          actions: true,
        },
      });

      if (modules.length === 0) {
        console.warn('⚠️  No modules found. Please run seed-modules first!');
        return;
      }

      console.log(`Found ${modules.length} modules`);

      let permissionsCreated = 0;
      let permissionsSkipped = 0;

      // For each module, create a permission for each action
      for (const module of modules) {
        for (const action of module.actions) {
          // Create unique key: module:action
          const permissionKey = `${module.moduleKey}:${action.actionName}`;

          // Check if permission already exists
          const existingPermission = await prisma.permission.findFirst({
            where: {
              actionId: action.id,
            },
          });

          if (existingPermission) {
            permissionsSkipped++;
          } else {
            // Create permission linking action to module
            await prisma.permission.create({
              data: {
                actionId: action.id,
              },
            });

            permissionsCreated++;
            console.log(`✓ Created permission: ${permissionKey}`);
          }
        }
      }

      console.log(`✓ Permissions seeding complete!`);
      console.log(`  - Created: ${permissionsCreated}`);
      console.log(`  - Skipped: ${permissionsSkipped}`);
      console.log(
        `  - Total permissions: ${permissionsCreated + permissionsSkipped}`,
      );
    } catch (error) {
      console.error('✗ Permission seeding failed:', error);
      throw error;
    }
  }
  
  
async function main() {
  try {
    console.log('🌱 Starting permissions seed...\n');
    await seed();
    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();



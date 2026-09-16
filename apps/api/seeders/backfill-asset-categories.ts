import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';
import { seedDefaultAssetCategories } from './seed-asset-categories';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Backfills the default asset categories onto every existing entity. Run once
 * after deploying the asset-categories migration:
 *   npm run backfill:asset-categories   (from apps/api/)
 * Safe to re-run — entities that already have any categories are skipped.
 */
async function main() {
  try {
    console.log('🌱 Backfilling asset categories for all entities...\n');

    const entities = await prisma.entity.findMany({
      select: { id: true, groupId: true, name: true },
    });

    console.log(`Found ${entities.length} entities\n`);

    for (const entity of entities) {
      console.log(`— ${entity.name} (${entity.id})`);
      await seedDefaultAssetCategories(entity.id, entity.groupId);
    }

    console.log('✅ Backfill completed successfully');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

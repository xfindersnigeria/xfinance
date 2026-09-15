import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';
import { seedDefaultStatutoryDeductions } from './seed-statutory-deductions';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Backfills the default statutory deductions (NHF, NHIS, Pension, PAYE) onto
 * every existing entity. Run once after deploying the seeder, e.g.:
 *   npx ts-node apps/api/seeders/backfill-statutory-deductions.ts
 * Safe to re-run — seedDefaultStatutoryDeductions skips names that already exist.
 */
async function main() {
  try {
    console.log('🌱 Backfilling statutory deductions for all entities...\n');

    const entities = await prisma.entity.findMany({
      select: { id: true, groupId: true, name: true },
    });

    console.log(`Found ${entities.length} entities\n`);

    for (const entity of entities) {
      console.log(`— ${entity.name} (${entity.id})`);
      await seedDefaultStatutoryDeductions(entity.id, entity.groupId);
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

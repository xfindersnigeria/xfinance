import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Default fixed-asset classes with their straight-line annual depreciation
 * rates (percent of cost). Admins can rename/re-rate or add more afterwards.
 */
const DEFAULT_ASSET_CATEGORIES = [
  { name: 'Motor vehicle', depreciationRate: 20 },
  { name: 'Plant & Machinery', depreciationRate: 15 },
  { name: 'Furniture & Fittings', depreciationRate: 10 },
  { name: 'Office Equipment', depreciationRate: 10 },
  { name: 'Office Building', depreciationRate: 2 },
];

/**
 * Seeds the default asset categories for an entity. Only runs when the entity
 * has no asset categories yet — once an admin has any (including renamed
 * defaults), re-running never adds duplicates alongside them.
 */
async function seedDefaultAssetCategories(entityId: string, groupId: string) {
  const existing = await prisma.assetCategory.count({ where: { entityId } });
  if (existing > 0) {
    console.log(`  ↷ ${existing} asset categories already exist, skipping`);
    return;
  }

  const { count } = await prisma.assetCategory.createMany({
    data: DEFAULT_ASSET_CATEGORIES.map((c) => ({ ...c, entityId, groupId })),
    skipDuplicates: true,
  });
  console.log(`  ✓ Created ${count} default asset categories`);
}

export { seedDefaultAssetCategories };

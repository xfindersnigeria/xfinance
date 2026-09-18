import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Nigerian VAT defaults (Settings → Tax). Admins can rename, re-rate, add
 * rates/groups/exemptions or switch the default afterwards.
 */
const VAT_RATE = 7.5;

const DEFAULT_EXEMPTIONS = [
  { name: 'Basic Food Items', code: 'FOOD-001', description: 'VAT-exempt basic food items' },
  { name: 'Medical & Pharmaceutical Products', code: 'MED-001', description: 'VAT-exempt medical and pharmaceutical products' },
  { name: 'Educational Materials', code: 'EDU-001', description: 'Books and educational materials' },
  { name: 'Exports', code: 'EXP-001', description: 'Exported goods and services' },
];

/**
 * Seeds the default tax setup for an entity: a Nigeria jurisdiction, a
 * default VAT rate, a zero rate and the common VAT exemptions. Only runs when
 * the entity has no tax rates yet, so re-running never duplicates or
 * overrides an admin's setup.
 *
 * An entity that already taxes at a different default (Settings.taxRate from
 * before tax settings existed) keeps it: that rate is seeded as the default so
 * new documents are taxed exactly as before.
 */
async function seedDefaultTaxSettings(entityId: string, groupId: string) {
  const existing = await prisma.taxRate.count({ where: { entityId } });
  if (existing > 0) {
    console.log(`  ↷ ${existing} tax rates already exist, skipping`);
    return;
  }

  const settings = await prisma.settings.findFirst({
    where: { entityId },
    select: { taxRate: true },
  });
  const legacyRate = settings?.taxRate ?? null;
  const keepLegacyDefault = legacyRate !== null && legacyRate > 0 && legacyRate !== VAT_RATE;

  await prisma.$transaction(async (tx) => {
    const jurisdiction = await tx.taxJurisdiction.upsert({
      where: { entityId_name: { entityId, name: 'Nigeria' } },
      update: {},
      create: {
        name: 'Nigeria',
        description: 'Federal VAT (FIRS)',
        countryCode: 'NG',
        entityId,
        groupId,
      },
    });

    await tx.taxRate.createMany({
      data: [
        {
          name: 'VAT',
          type: 'VAT',
          rate: VAT_RATE,
          isDefault: !keepLegacyDefault,
          jurisdictionId: jurisdiction.id,
          entityId,
          groupId,
        },
        {
          name: 'Zero Rated',
          type: 'VAT',
          rate: 0,
          jurisdictionId: jurisdiction.id,
          entityId,
          groupId,
        },
        ...(keepLegacyDefault
          ? [
              {
                name: 'Sales Tax',
                type: 'Sales Tax',
                rate: legacyRate!,
                isDefault: true,
                jurisdictionId: jurisdiction.id,
                entityId,
                groupId,
              },
            ]
          : []),
      ],
      skipDuplicates: true,
    });

    await tx.taxExemption.createMany({
      data: DEFAULT_EXEMPTIONS.map((e) => ({ ...e, entityId, groupId })),
      skipDuplicates: true,
    });

    // Keep the legacy column in step with the default rate
    await tx.settings.updateMany({
      where: { entityId },
      data: { taxRate: keepLegacyDefault ? legacyRate! : VAT_RATE },
    });
  });

  console.log(
    `  ✓ Seeded tax settings (default ${keepLegacyDefault ? `Sales Tax ${legacyRate}%` : `VAT ${VAT_RATE}%`})`,
  );
}

export { seedDefaultTaxSettings };

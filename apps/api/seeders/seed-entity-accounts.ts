import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Create accounts for all subcategories in the group
 * ONE account per subcategory per entity
 */
async function seedDefaultEntityAccounts(entityId: string, groupId: string) {
  try {
    console.log(`Seeding accounts for entity: ${entityId} in group: ${groupId}`);

    // Fetch the entity to get its name
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new Error(`Entity with ID ${entityId} not found`);
    }

    // Fetch all subcategories for this group
    const subCategories = await prisma.accountSubCategory.findMany({
      where: {
        category: {
          groupId,
        },
      },
      include: {
        category: true,
      },
      orderBy: [
        { category: { code: 'asc' } },
        { code: 'asc' },
      ],
    });

    if (subCategories.length === 0) {
      console.warn(
        `⚠ No subcategories found for group ${groupId}. Skipping account creation.`,
      );
      return;
    }

    console.log(`  Found ${subCategories.length} subcategories`);

    // Create one account per subcategory
    let createdCount = 0;
    let skippedCount = 0;

    for (const subCategory of subCategories) {
      try {
        // Check if account already exists for this entity and subcategory
        const existingAccount = await prisma.account.findFirst({
          where: {
            entityId,
            subCategoryId: subCategory.id,
          },
        });

        if (existingAccount) {
          console.log(`  • Account already exists for ${subCategory.name}`);
          skippedCount++;
          continue;
        }

        // Generate account code: {subCategoryCode}-01
        const accountCode = `${subCategory.code}-01`;

        // Create account with subcategory name
        const account = await prisma.account.create({
          data: {
            name: subCategory.name,
            code: accountCode,
            description: `${subCategory.name} for ${entity.name}`,
            subCategoryId: subCategory.id,
            entityId,
            groupId,
            balance: 0,
          },
        });

        console.log(
          `  ✓ Created account: ${subCategory.name} (${accountCode})`,
        );
        createdCount++;
      } catch (error) {
        console.error(
          `  ✗ Failed to create account for ${subCategory.name}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    console.log(
      `✓ Account seeding completed for entity: ${entityId}`,
    );
    console.log(`  Created: ${createdCount}, Skipped: ${skippedCount}\n`);
  } catch (error) {
    console.error('Error seeding entity accounts:', error);
    throw error;
  }
}

export { seedDefaultEntityAccounts };

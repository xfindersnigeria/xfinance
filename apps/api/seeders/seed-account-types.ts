import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Seed fixed account types (system-wide)
 * These are the 5 main accounting types that never change
 */
async function seedAccountTypes() {
  try {
    console.log('Seeding account types...');

    const types = [
      {
        code: '1000',
        name: 'Assets',
        description: 'All asset accounts (current and non-current)',
      },
      {
        code: '2000',
        name: 'Liabilities',
        description: 'All liability accounts (current and non-current)',
      },
      {
        code: '3000',
        name: 'Equity',
        description: 'Owner equity and retained earnings',
      },
      {
        code: '4000',
        name: 'Revenue',
        description: 'All revenue and income accounts',
      },
      {
        code: '5000',
        name: 'Expenses',
        description: 'All expense and cost accounts',
      },
    ];

    for (const type of types) {
      const existing = await prisma.accountType.findUnique({
        where: { code: type.code },
      });

      if (!existing) {
        await prisma.accountType.create({ data: type });
        console.log(`✓ Created account type: ${type.name} (${type.code})`);
      } else {
        console.log(`• Account type already exists: ${type.name}`);
      }
    }

    console.log('Account types seeding completed!\n');
  } catch (error) {
    console.error('Error seeding account types:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🌱 Starting account types seed...\n');
    await seedAccountTypes();
    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

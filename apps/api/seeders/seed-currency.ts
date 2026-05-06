import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Default currencies for new groups
 */
const defaultCurrencies = [
  {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    exchangeRate: 1,
    isPrimary: true,
    isActive: true,
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    exchangeRate: 0.0006,
    isPrimary: false,
    isActive: true,
  },
];

async function seedDefaultCurrencies(groupId: string) {
  try {
    console.log(`Seeding default currencies for group: ${groupId}`);

    for (const currencyData of defaultCurrencies) {
      // Check if currency already exists for this group
      const existing = await prisma.groupCurrency.findFirst({
        where: {
          groupId,
          code: currencyData.code,
        },
      });

      if (!existing) {
        await prisma.groupCurrency.create({
          data: {
            ...currencyData,
            groupId,
          },
        });
        console.log(`  ✓ Created currency: ${currencyData.name} (${currencyData.code})`);
      } else {
        console.log(`  • Currency already exists: ${currencyData.code}`);
      }
    }

    console.log(`✓ Default currencies seeded for group: ${groupId}\n`);
  } catch (error) {
    console.error('Error seeding default currencies:', error);
    throw error;
  }
}

export { seedDefaultCurrencies };

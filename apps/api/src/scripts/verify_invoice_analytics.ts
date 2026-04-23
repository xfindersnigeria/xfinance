
import { NestFactory } from '@nestjs/core';
import { InvoiceService } from '@/sales/invoice/invoice.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Module } from '@nestjs/common';
import { InvoiceController } from '@/sales/invoice/invoice.controller';

@Module({
  providers: [InvoiceService, PrismaService],
  controllers: [InvoiceController],
})
class AppModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prismaService = app.get(PrismaService);
  const invoiceService = app.get(InvoiceService);

  // Get an entity
  const entity = await prismaService.entity.findFirst();
  if (!entity) {
    console.log('No entity found');
    await app.close();
    return;
  }
  
  console.log(`Using Entity ID: ${entity.id}`);

  try {
    const analytics = await invoiceService.getInvoiceAnalytics(entity.id);
    console.log('Analytics Result:');
    console.log(JSON.stringify(analytics, null, 2));
  } catch (error) {
    console.error('Error fetching analytics:', error);
  }

  await app.close();
}

main();

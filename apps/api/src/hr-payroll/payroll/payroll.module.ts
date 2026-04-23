import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { PdfModule } from '@/pdf/pdf.module';

@Module({
  imports: [PrismaModule, BullmqModule, PdfModule],
  providers: [PayrollService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [PayrollController],
})
export class PayrollModule {}

import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';
import { EmailService } from '@/email/email.service';
import { BudgetService } from '@/accounts/budget/budget.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  controllers: [ReportsController],
  providers: [ReportsService, BudgetService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
})
export class ReportsModule {}

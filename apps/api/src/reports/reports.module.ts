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
import { PdfModule } from '@/pdf/pdf.module';
import { ReportExportService } from './export/report-export.service';
import { GroupReportsController } from './group/group-reports.controller';
import { GroupReportsService } from './group/group-reports.service';
import { GroupCurrencyService } from './group/group-currency.service';

@Module({
  imports: [PrismaModule, BullmqModule, PdfModule],
  controllers: [ReportsController, GroupReportsController],
  providers: [ReportsService, ReportExportService, GroupReportsService, GroupCurrencyService, BudgetService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
})
export class ReportsModule {}

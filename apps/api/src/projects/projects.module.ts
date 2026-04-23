import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { BankingService } from '@/banking/banking.service';
import { AccountService } from '@/accounts/account/account.service';
import { OpeningBalanceService } from '@/accounts/opening-balance/opening-balance.service';
import { PdfService } from '@/pdf/pdf.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';

@Module({
  imports:[PrismaModule, BullmqModule],
  providers: [ProjectsService,  AuthService, BankingService, AccountService, OpeningBalanceService, PdfService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [ProjectsController]
})
export class ProjectsModule {}

import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { BankingService } from '@/banking/banking.service';
import { AccountService } from '@/accounts/account/account.service';
import { OpeningBalanceService } from '@/accounts/opening-balance/opening-balance.service';
import { PdfService } from '@/pdf/pdf.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [CurrencyService, AuthService,  BankingService, AccountService, OpeningBalanceService, PdfService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [CurrencyController],
})
export class CurrencyModule {}

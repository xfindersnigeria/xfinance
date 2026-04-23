import { Module, forwardRef } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountModule } from '../accounts/account/account.module';
import { OpeningBalanceModule } from '../accounts/opening-balance/opening-balance.module';
import { BullmqModule } from '../bullmq/bullmq.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


@Module({
  imports: [PrismaModule, AccountModule, forwardRef(() => OpeningBalanceModule), forwardRef(() => BullmqModule)],
  providers: [BankingService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [BankingController],
})
export class BankingModule {}

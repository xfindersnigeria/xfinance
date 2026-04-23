import { Module } from '@nestjs/common';
import { AccountTransactionService } from './account-transaction.service';
import { AccountTransactionController } from './account-transaction.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  controllers: [AccountTransactionController],
  providers: [AccountTransactionService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  exports: [AccountTransactionService],
})
export class AccountTransactionModule {}

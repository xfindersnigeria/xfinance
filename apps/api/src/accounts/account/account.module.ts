import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AuthService } from '@/auth/auth.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';

import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [AccountService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}

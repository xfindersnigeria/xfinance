import { Module } from '@nestjs/common';
import { AccountCategoryService } from './account-category.service';
import { AccountCategoryController } from './account-category.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  controllers: [AccountCategoryController],
  providers: [AccountCategoryService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  exports: [AccountCategoryService],
})
export class AccountCategoryModule {}

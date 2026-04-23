import { Module } from '@nestjs/common';
import { AccountSubCategoryService } from './account-subcategory.service';
import { AccountSubCategoryController } from './account-subcategory.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  controllers: [AccountSubCategoryController],
  providers: [AccountSubCategoryService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  exports: [AccountSubCategoryService],
})
export class AccountSubCategoryModule {}

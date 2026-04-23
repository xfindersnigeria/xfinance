import { Module } from '@nestjs/common';
import { ProductCategoryService } from './category.service';
import { ProductCategoryController } from './category.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [ProductCategoryService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [ProductCategoryController],
})
export class ProductCategoryModule {}

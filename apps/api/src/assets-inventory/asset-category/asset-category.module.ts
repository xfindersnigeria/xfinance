import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { EmailService } from '@/email/email.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { AssetCategoryController } from './asset-category.controller';
import { AssetCategoryService } from './asset-category.service';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [AssetCategoryService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
  controllers: [AssetCategoryController],
})
export class AssetCategoryModule {}

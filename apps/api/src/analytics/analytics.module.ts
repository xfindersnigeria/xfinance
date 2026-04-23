import { AuthService } from './../auth/auth.service';
import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@/prisma/prisma.service';
import { MenuService } from '@/menu/menu.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { CacheService } from '@/cache/cache.service';
import { CacheInvalidationService } from '@/cache/cache-invalidation.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [BullmqModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PrismaService, AuthService, MenuService, SubscriptionService, CacheService, CacheInvalidationService, PubsubService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

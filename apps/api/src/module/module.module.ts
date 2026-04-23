import { Module } from '@nestjs/common';
import { ModuleController } from './module.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { ModuleService } from './module.service';
import { BullmqModule } from '@/bullmq/bullmq.module';


@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [ModuleService, CacheInvalidationService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [ModuleController],
  exports: [ModuleService],
})
export class ModuleModule {}

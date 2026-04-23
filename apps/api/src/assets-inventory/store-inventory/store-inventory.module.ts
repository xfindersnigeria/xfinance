import { Module } from '@nestjs/common';
import { StoreInventoryController } from './store-inventory.controller';
import { StoreInventoryService } from './store-inventory.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule , BullmqModule],
  controllers: [StoreInventoryController],
  providers: [StoreInventoryService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  exports: [StoreInventoryService],
})
export class StoreInventoryModule {}

import { Module } from '@nestjs/common';
import { RestockHistoryController } from './restock-history.controller';
import { RestockHistoryService } from './restock-history.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';


@Module({
  imports: [PrismaModule, BullmqModule],
  controllers: [RestockHistoryController],
  providers: [RestockHistoryService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  exports: [RestockHistoryService],
})
export class RestockHistoryModule {}

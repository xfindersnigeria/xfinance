import { forwardRef, Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service'
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { SubscriptionModule } from '@/subscription/subscription.module';


@Module({
  imports: [PrismaModule, BullmqModule, forwardRef(() => SubscriptionModule)],
  providers: [MenuService, CacheService, PubsubService],
  exports: [MenuService],
})
export class MenuModule {}

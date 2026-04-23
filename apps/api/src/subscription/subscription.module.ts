import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { BullmqModule } from '../bullmq/bullmq.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionExpiryCronService } from './subscription-expiry.cron';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [
    SubscriptionService,
    SubscriptionExpiryCronService,
    AuthService,
    MenuService,
    CacheService,
    PubsubService,
  ],
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}

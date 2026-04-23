import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';



@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [ReceiptService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [ReceiptController],
})
export class ReceiptModule {}

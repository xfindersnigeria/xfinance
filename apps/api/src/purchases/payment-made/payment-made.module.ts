import { Module } from '@nestjs/common';
import { PaymentMadeService } from './payment-made.service';
import { PaymentMadeController } from './payment-made.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';



@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [PaymentMadeService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [PaymentMadeController]
})
export class PaymentMadeModule {}

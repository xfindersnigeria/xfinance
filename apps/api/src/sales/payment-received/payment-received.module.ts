import { Module } from '@nestjs/common';
import { PaymentReceivedService } from './payment-received.service';
import { PaymentReceivedController } from './payment-received.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { InvoiceModule } from '../invoice/invoice.module';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


@Module({
  imports: [PrismaModule, InvoiceModule, BullmqModule],
  providers: [PaymentReceivedService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [PaymentReceivedController],
})
export class PaymentReceivedModule {}

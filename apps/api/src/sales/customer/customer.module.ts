import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [CustomerService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [CustomerController],
})
export class CustomerModule {}

import { Module } from '@nestjs/common';
import { ProductUnitService } from './unit.service';
import { ProductUnitController } from './unit.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { EmailService } from '@/email/email.service';


import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [ProductUnitService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
  controllers: [ProductUnitController],
})
export class ProductUnitModule {}

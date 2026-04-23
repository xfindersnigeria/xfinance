import { Module } from '@nestjs/common';
import { ProductBrandService } from './brand.service';
import { ProductBrandController } from './brand.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [ProductBrandService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [ProductBrandController],
})
export class ProductBrandModule {}

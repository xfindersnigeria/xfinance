import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { PubsubService } from '@/cache/pubsub.service';
import { ModuleService } from '@/module/module.service';
import { CacheInvalidationService } from '@/cache/cache-invalidation.service';
import { BullmqModule } from '@/bullmq/bullmq.module';



@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [RoleService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, ModuleService, CacheInvalidationService],
  controllers: [RoleController],
  exports: [RoleService],
})
export class RoleModule {}

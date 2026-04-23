import { Module } from '@nestjs/common';
import { SettingsModulesService } from './settings-modules.service';
import { SettingsModulesController } from './settings-modules.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [SettingsModulesService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [SettingsModulesController],
})
export class SettingsModulesModule {}

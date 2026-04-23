import { Module } from '@nestjs/common';
import { LogService } from './log.service';
import { LogController } from './log.controller';
import { AuditController } from './audit.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';

import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [LogService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [LogController, AuditController],
})
export class LogModule {}

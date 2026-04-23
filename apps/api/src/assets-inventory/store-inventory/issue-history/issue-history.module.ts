import { Module } from '@nestjs/common';
import { IssueHistoryController } from './issue-history.controller';
import { IssueHistoryService } from './issue-history.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';


@Module({
  imports: [PrismaModule, BullmqModule],
  controllers: [IssueHistoryController],
  providers: [IssueHistoryService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  exports: [IssueHistoryService],
})
export class IssueHistoryModule {}

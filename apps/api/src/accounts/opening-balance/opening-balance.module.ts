import { Module, forwardRef } from '@nestjs/common';
import { OpeningBalanceService } from './opening-balance.service';
import { OpeningBalanceController } from './opening-balance.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


@Module({
  imports: [PrismaModule, forwardRef(() => BullmqModule)],
  providers: [OpeningBalanceService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [OpeningBalanceController],
  exports: [OpeningBalanceService],
})
export class OpeningBalanceModule {}

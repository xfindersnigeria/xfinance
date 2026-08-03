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
import { EmailService } from '@/email/email.service';



@Module({
  // BullmqModule is not needed by OpeningBalanceService itself (posting is now
  // synchronous) — it's still required here because SubscriptionService, which
  // this module also provides locally, depends on BullmqService.
  imports: [PrismaModule, forwardRef(() => BullmqModule)],
  providers: [OpeningBalanceService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
  controllers: [OpeningBalanceController],
  exports: [OpeningBalanceService],
})
export class OpeningBalanceModule {}

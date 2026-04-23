import { Module } from '@nestjs/common';
import { OtherDeductionService } from './other-deduction.service';
import { OtherDeductionController } from './other-deduction.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [OtherDeductionService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [OtherDeductionController],
})
export class OtherDeductionModule {}

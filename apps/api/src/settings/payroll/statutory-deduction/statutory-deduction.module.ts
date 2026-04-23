import { Module } from '@nestjs/common';
import { StatutoryDeductionService } from './statutory-deduction.service';
import { StatutoryDeductionController } from './statutory-deduction.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [StatutoryDeductionService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [StatutoryDeductionController],
})
export class StatutoryDeductionModule {}

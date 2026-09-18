import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { EmailService } from '@/email/email.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [TaxService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
  controllers: [TaxController],
})
export class TaxSettingsModule {}

import { Module } from '@nestjs/common';
import { AccountTypeService } from './account-type.service';
import { AccountTypeController } from './account-type.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { EmailService } from '@/email/email.service';



import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, BullmqModule],
  controllers: [AccountTypeController],
  providers: [AccountTypeService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
  exports: [AccountTypeService],
})
export class AccountTypeModule {}

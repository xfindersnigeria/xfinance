import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { BullmqModule } from '../bullmq/bullmq.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { PubsubService } from '@/cache/pubsub.service';


@Module({
  imports: [PrismaModule, SubscriptionModule, BullmqModule],
  providers: [UserService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}

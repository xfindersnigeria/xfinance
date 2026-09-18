import { Module } from '@nestjs/common';
import { StoreItemsService } from './store-items.service';
import { StoreItemsController } from './store-items.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { PubsubService } from '@/cache/pubsub.service';
import { EmailService } from '@/email/email.service';



import { BullmqModule } from '@/bullmq/bullmq.module';
import { FileuploadModule } from '@/fileupload/fileupload.module';

@Module({
  imports: [PrismaModule, BullmqModule, FileuploadModule],
  providers: [StoreItemsService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
  controllers: [StoreItemsController],
})
export class StoreItemsModule {}

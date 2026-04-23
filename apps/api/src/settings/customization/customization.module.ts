import { Module } from '@nestjs/common';
import { CustomizationService } from './customization.service';
import { CustomizationController, PublicCustomizationController } from './customization.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { FileuploadModule } from '@/fileupload/fileupload.module';
import { CacheService } from '@/cache/cache.service';
import { PubsubService } from '@/cache/pubsub.service';
import { AuthService } from '@/auth/auth.service';
import { MenuService } from '@/menu/menu.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { BullmqModule } from '@/bullmq/bullmq.module';

@Module({
  imports: [PrismaModule, FileuploadModule, BullmqModule],
  providers: [
    CustomizationService,
    CacheService,
    PubsubService,
    AuthService,
    MenuService,
    SubscriptionService,
  ],
  controllers: [CustomizationController, PublicCustomizationController],
  exports: [CustomizationService],
})
export class CustomizationModule {}

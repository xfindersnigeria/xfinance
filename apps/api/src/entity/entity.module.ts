import { Module } from '@nestjs/common';
import { EntityService } from './entity.service';
import { EntityController } from './entity.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { FileuploadModule } from '@/fileupload/fileupload.module';
import { CacheModule } from '@/cache/cache.module';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


@Module({
  imports: [PrismaModule, FileuploadModule, BullmqModule, CacheModule],
  controllers: [EntityController],
  providers: [EntityService, AuthService, MenuService, SubscriptionService],
})
export class EntityModule {}

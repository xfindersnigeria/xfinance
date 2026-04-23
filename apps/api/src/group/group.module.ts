import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { AuthService } from '@/auth/auth.service';
import { FileuploadModule } from '@/fileupload/fileupload.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


@Module({
  imports: [PrismaModule, FileuploadModule, BullmqModule],
  controllers: [GroupController],
  providers: [GroupService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
})
export class GroupModule {}

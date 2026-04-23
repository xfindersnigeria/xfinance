import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { FileuploadModule } from '@/fileupload/fileupload.module';
import { JournalModule } from '@/accounts/journal/journal.module';
import { AuthService } from '@/auth/auth.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


@Module({
  imports: [PrismaModule, FileuploadModule, JournalModule, BullmqModule],
  controllers: [BillsController],
  providers: [BillsService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
})
export class BillsModule {}

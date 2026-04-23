import { Module, forwardRef } from '@nestjs/common';
import { JournalService } from './journal.service';
import { JournalPostingService } from './journal-posting.service';
import { JournalController } from './journal.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';


@Module({
  imports: [PrismaModule, forwardRef(() => BullmqModule)],
  providers: [JournalService, JournalPostingService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [JournalController],
  exports: [JournalPostingService, JournalService],
})
export class JournalModule {}

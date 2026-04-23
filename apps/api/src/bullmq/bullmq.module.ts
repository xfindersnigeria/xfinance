import { Module, forwardRef } from '@nestjs/common';
import { BullmqService } from './bullmq.service';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/prisma/prisma.module';
import { BullmqProcessor } from './bullmq.processor';
import { EmailService } from '@/email/email.service';
import { OpeningBalanceModule } from '@/accounts/opening-balance/opening-balance.module';
import { JournalModule } from '@/accounts/journal/journal.module';
import { CacheService } from '@/cache/cache.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({ name: 'default' }),
    PrismaModule,
    forwardRef(() => OpeningBalanceModule),
    forwardRef(() => JournalModule),
  ],
  providers: [BullmqService, BullmqProcessor, EmailService, CacheService],
  exports: [BullmqService, BullModule],
})
export class BullmqModule {}

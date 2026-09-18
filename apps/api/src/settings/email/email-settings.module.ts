import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { EmailService } from '@/email/email.service';
import { BullmqModule } from '@/bullmq/bullmq.module';
import { PdfService } from '@/pdf/pdf.service';
import { EntityMailerService } from '@/email/entity-mailer.service';
import { DocumentEmailService } from '@/email/document-email.service';
import { EmailSchedulerService } from '@/email/email-scheduler.service';
import { EmailSettingsController } from './email-settings.controller';
import { EmailSettingsService } from './email-settings.service';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [
    EmailSettingsService,
    EntityMailerService,
    DocumentEmailService,
    // The reminder/statement cron jobs — registered here only, so they run once
    EmailSchedulerService,
    PdfService,
    AuthService,
    MenuService,
    SubscriptionService,
    CacheService,
    PubsubService,
    EmailService,
  ],
  controllers: [EmailSettingsController],
})
export class EmailSettingsModule {}

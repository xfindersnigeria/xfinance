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
import { OrdersController, PublicStoreController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [
    OrdersService,
    EntityMailerService,
    DocumentEmailService,
    PdfService,
    AuthService,
    MenuService,
    SubscriptionService,
    CacheService,
    PubsubService,
    EmailService,
  ],
  controllers: [OrdersController, PublicStoreController],
})
export class OrdersModule {}

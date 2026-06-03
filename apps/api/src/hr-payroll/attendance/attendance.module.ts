import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { EmailService } from '@/email/email.service';




import { BullmqModule } from '@/bullmq/bullmq.module';
import { BullmqService } from '@/bullmq/bullmq.service';

@Module({
  imports: [PrismaModule, BullmqModule],
  providers: [AttendanceService, BullmqService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService, EmailService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}

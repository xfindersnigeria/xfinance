import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthService } from '@/auth/auth.service';
import { FileuploadModule } from '@/fileupload/fileupload.module';
import { CacheService } from '@/cache/cache.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { MenuService } from '@/menu/menu.service';
import { PubsubService } from '@/cache/pubsub.service';
import { BullmqModule } from '@/bullmq/bullmq.module';


@Module({
  imports: [PrismaModule, FileuploadModule, BullmqModule],
  providers: [EmployeeService, AuthService, MenuService, SubscriptionService, CacheService, PubsubService],
  controllers: [EmployeeController],
})
export class EmployeeModule {}

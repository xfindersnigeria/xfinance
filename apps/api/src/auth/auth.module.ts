import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuModule } from '../menu/menu.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CacheModule } from '../cache/cache.module';
import { AuthGuard } from './guards/auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [PrismaModule, MenuModule, SubscriptionModule, CacheModule],
  providers: [AuthService, AuthGuard, RolesGuard, PermissionsGuard],
  controllers: [AuthController],
  exports: [AuthService, MenuModule, SubscriptionModule, CacheModule],
})
export class AuthModule {}

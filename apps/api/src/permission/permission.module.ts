import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  providers: [PermissionService, PrismaService],
  exports: [PermissionService],
})
export class PermissionModule {}

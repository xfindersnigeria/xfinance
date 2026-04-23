import { Module, Global } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantService } from './tenant.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [TenantService, TenantContextService],
  exports: [TenantService, TenantContextService],
})
export class MultitenancyModule {}

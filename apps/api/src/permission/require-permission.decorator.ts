import { SetMetadata } from '@nestjs/common';

export const RequirePermission = (module: string, action: string) =>
  SetMetadata('requiredPermission', { module, action });

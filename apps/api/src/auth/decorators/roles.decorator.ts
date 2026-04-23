import { SetMetadata } from '@nestjs/common';
import { systemRole } from 'prisma/generated/enums';

export const Roles = (...roles: systemRole[]) => SetMetadata('roles', roles);

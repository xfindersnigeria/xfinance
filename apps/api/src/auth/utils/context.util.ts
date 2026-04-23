import { Request } from 'express';

export function getEffectiveGroupId(req: Request): string | null {
  return (req.groupImpersonation?.groupId ?? req.user?.groupId ?? null) as
    | string
    | null;
}

export function getEffectiveEntityId(req: Request): string | null {
  return (req.entityImpersonation?.entityId ?? req.user?.entityId ?? null) as
    | string
    | null;
}

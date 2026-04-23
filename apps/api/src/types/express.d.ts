declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        groupId: string | null;
        entityId: string | null;
        systemRole: string;
        permissions?: string[];
      };
      groupImpersonation?: {
        groupId: unknown;
        groupName: unknown;
      };
      entityImpersonation?: {
        entityId: unknown;
        entityName: unknown;
      };
    }
  }
}

export {};
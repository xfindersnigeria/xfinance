import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleScope, systemRole } from 'prisma/generated/enums';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if user has permission for a specific module/action
   * 
   * TWO-LEVEL PERMISSION CHECK:
   * Level 1: Entity/Admin access check (context-based)
   * Level 2: Specific permission check (explicit > role)
   * 
   * For SUPERADMIN: Always allowed (bypass all checks)
   * 
   * For USERS (entityId provided):
   *   - Must belong to that entity
   *   - Module must be USER-scope
   * 
   * For ADMINS (no entityId OR entityId provided):
   *   - If accessing entity operations: 
   *     * If adminEntities is empty [] = has access to ALL entities in group
   *     * If adminEntities is set = must have that entity in adminEntities (NO-AUTOMATIC rule)
   *   - If accessing admin operations: only needs permission (no entity check)
   *   - Role's scope must be ADMIN
   */
  async hasPermission(
    userId: string,
    entityId: string | null,
    module: string,
    action: string,
    context?: Record<string, any>,
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    // Get user with role and permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  include: {
                    action: {
                      include: {
                        module: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        explicitPermissions: {
          include: {
            permission: {
              include: {
                action: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return false;

    // SUPERADMIN: Bypass all checks
    if (user.systemRole === systemRole.superadmin) {
      return true;
    }

    if (!user.role) return false;

    // Get module to check its scope
    const permModule = await this.prisma.module.findFirst({
      where: { moduleKey: module },
    });

    if (!permModule) return false;

    // ========== LEVEL 1: CONTEXT ACCESS CHECK ==========

    if (entityId) {
      // Entity-level operation requested
      
      if (user.systemRole === systemRole.user) {
        // Regular user: must belong to that entity
        if (user.entityId !== entityId) {
          return false;
        }
        // Module must support entity-level operations (USER-scope)
        if (permModule.scope !== ModuleScope.ENTITY) {
          return false;
        }
      }

      if (user.systemRole === systemRole.admin) {
        // Admin: Check entity access with FULL-ACCESS rule
        // If adminEntities is empty [] = full access to all entities in group
        // If adminEntities is set = must have entity in list (NO-AUTOMATIC rule)
        if (user.adminEntities && user.adminEntities.length > 0) {
          // adminEntities is explicitly set - check against it
          if (!user.adminEntities.includes(entityId)) {
            return false;
          }
        }
        // If adminEntities is null or empty [], admin has full access to all entities

        // Module must support entity-level operations (USER-scope)
        if (permModule.scope !== ModuleScope.ENTITY) {
          return false;
        }
      }
    } else {
      // Admin-level operation requested (no entityId)
      
      if (user.systemRole !== systemRole.admin) {
        // Only admins can do admin operations
        return false;
      }
      // Module must support admin-level operations (ADMIN-scope)
      if (permModule.scope !== ModuleScope.GROUP) {
        return false;
      }
    }

    // ========== LEVEL 2: PERMISSION CHECK ==========
    // Hierarchy: explicit overrides > role permissions > deny

    // Check explicit permission first (highest priority)
    for (const explicit of user.explicitPermissions) {
      if (
        explicit.permission.action.module.moduleKey === module &&
        explicit.permission.action.actionName === action
      ) {
        return explicit.allowed; // true = grant, false = deny
      }
    }

    // Check role permissions
    for (const rolePermission of user.role.rolePermissions) {
      if (
        rolePermission.permission.action.module.moduleKey === module &&
        rolePermission.permission.action.actionName === action
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all permissions for a user in a specific scope (entity or admin)
   */
  async getUserPermissions(
    userId: string,
    entityId: string | null,
  ): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  include: {
                    action: {
                      include: {
                        module: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        explicitPermissions: {
          include: {
            permission: {
              include: {
                action: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.role) return [];

    const permissions = new Set<string>();

    // Add role-based permissions
    for (const rolePermission of user.role.rolePermissions) {
      const perm = rolePermission.permission;
      const key = `${perm.action.module.moduleKey}:${perm.action.actionName}`;
      permissions.add(key);
    }

    // Add/remove explicit permissions
    for (const explicit of user.explicitPermissions) {
      const key = `${explicit.permission.action.module.moduleKey}:${explicit.permission.action.actionName}`;
      if (explicit.allowed) {
        permissions.add(key);
      } else {
        permissions.delete(key);
      }
    }

    return Array.from(permissions);
  }

  /**
   * Check if user is admin in a group
   */
  async isAdminInGroup(userId: string, groupId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return user?.systemRole === systemRole.admin && user?.groupId === groupId;
  }

  /**
   * Check if admin has access to a specific entity
   * FULL-ACCESS rule: If adminEntities is empty [] = access to ALL entities
   * NO-AUTOMATIC rule: If adminEntities is set, must be in the list
   */
  async canAdminAccessEntity(userId: string, entityId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.systemRole !== systemRole.admin) {
      return false;
    }

    // If adminEntities is null or empty [] = full access to all entities
    if (!user.adminEntities || user.adminEntities.length === 0) {
      return true; // Full access
    }

    // If adminEntities is set, must have entity in list
    return user.adminEntities.includes(entityId);
  }

  /**
   * Check if admin has access to all entities in a group
   * Returns true if adminEntities is empty [] (full access)
   */
  hasFullEntityAccess(adminEntities: string[] | null | undefined): boolean {
    return !adminEntities || adminEntities.length === 0;
  }
}

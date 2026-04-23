
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';
import { RoleScope, ModuleScope, PermissionAction } from 'prisma/generated/enums';
import { ModuleService } from '@/module/module.service';

/**
 * Role Service
 * 
 * Handles role CRUD operations with complex permission validation:
 * 1. At least one permission must exist
 * 2. If an action other than 'View' is selected for a module, 'View' must also be included
 *    Example: items:import requires items:view
 * 3. For USER scope roles: all permissions must be from ENTITY/GROUP modules (not SUPERADMIN)
 * 4. For ADMIN scope roles: permissions must be from GROUP/ENTITY modules (not SUPERADMIN)
 */
@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private cacheInvalidationService: CacheInvalidationService,
    private moduleService: ModuleService,
  ) {}

  /**
   * Create a new role for a group
   * Validates permissions according to scope and module availability
   */
  async createRole(groupId: string, userId: string, dto: CreateRoleDto) {
    // 1. Validate at least one permission is provided
    if (!dto.permissionIds || dto.permissionIds.length === 0) {
      throw new BadRequestException('At least one permission must be selected');
    }

    // 2. Fetch all requested permissions with their module and action details
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: dto.permissionIds },
      },
      include: {
        action: {
          include: {
            module: true,
          },
        },
      },
    });

    // Validate all permission IDs exist
    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // 3. Validate scope-based module access
    this.validatePermissionsByScope(permissions, dto.scope);

    // 4. Auto-add view permissions if missing for any module
    // Fetch all missing view permissions and add them automatically
    const enhancedPermissionIds = await this.ensureViewPermissionsAdded(
      dto.permissionIds,
      permissions,
      groupId,
    );

    // 5. Verify role name is unique within this group
    const existingRole = await this.prisma.role.findUnique({
      where: {
        groupId_name_scope: {
          groupId,
          name: dto.name,
          scope: dto.scope,
        },
      },
    });

    if (existingRole) {
      throw new BadRequestException(
        `Role "${dto.name}" (scope: ${dto.scope}) already exists in this group`,
      );
    }

    // 6. Create the role with enhanced permission IDs (view added if missing)
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        groupId,
        scope: dto.scope,
        rolePermissions: {
          createMany: {
            data: enhancedPermissionIds.map((permissionId) => ({
              permissionId,
            })),
          },
        },
      },
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
    });

    // 7. Invalidate caches and publish role change event
    await this.cacheInvalidationService.invalidateGroupRoleCache(groupId);
    await this.cacheInvalidationService.invalidateAllPermissionsCache();

    // Publish role-change event via Redis pubsub
    await this.cacheInvalidationService.publishRoleChangeEvent(
      groupId,
      role.id,
      role.name,
    );

    return this.formatRoleResponse(role);
  }

  /**
   * Get all roles for a group with optional search and pagination
   */
  async getRolesByGroup(
    groupId: string,
    options?: { search?: string; page?: number; limit?: number },
  ) {
    const { search, page = 1, limit = 10 } = options || {};

    // Build where clause
    const where: any = { groupId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch total count for pagination
    const total = await this.prisma.role.count({ where });

    // Fetch paginated roles
    const roles = await this.prisma.role.findMany({
      where,
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
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: roles.map((role) => this.formatRoleResponse(role)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single role by ID
   */
  async getRoleById(groupId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
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
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.groupId !== groupId) {
      throw new ForbiddenException('You do not have access to this role');
    }

    return this.formatRoleResponse(role);
  }

  /**
   * Update a role's name, description, and permissions
   */
  async updateRole(
    groupId: string,
    roleId: string,
    userId: string,
    dto: UpdateRoleDto,
  ) {
    // 1. Verify role exists and belongs to this group
    const existingRole = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: true,
      },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    if (existingRole.groupId !== groupId) {
      throw new ForbiddenException('You do not have access to this role');
    }

    // Prevent modification of system roles
    if (existingRole.isSystemRole) {
      throw new ForbiddenException('System roles cannot be modified');
    }

    // 2. Validate permission IDs if provided
    if (dto.permissionIds) {
      if (dto.permissionIds.length === 0) {
        throw new BadRequestException(
          'At least one permission must be selected',
        );
      }

      const permissions = await this.prisma.permission.findMany({
        where: {
          id: { in: dto.permissionIds },
        },
        include: {
          action: {
            include: {
              module: true,
            },
          },
        },
      });

      if (permissions.length !== dto.permissionIds.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }

      // Validate scope-based module access
      this.validatePermissionsByScope(permissions, existingRole.scope);

      // Auto-add view permissions if missing for any module
      const enhancedPermissionIds = await this.ensureViewPermissionsAdded(
        dto.permissionIds,
        permissions,
        groupId,
      );
      dto.permissionIds = enhancedPermissionIds;
    }

    // 3. Check name uniqueness if name is being updated
    if (dto.name && dto.name !== existingRole.name) {
      const duplicateName = await this.prisma.role.findUnique({
        where: {
          groupId_name_scope: {
            groupId,
            name: dto.name,
            scope: existingRole.scope,
          },
        },
      });

      if (duplicateName) {
        throw new BadRequestException(
          `Role "${dto.name}" (scope: ${existingRole.scope}) already exists in this group`,
        );
      }
    }

    // 4. Update the role
    const updated = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.permissionIds && {
          rolePermissions: {
            deleteMany: {}, // Delete existing
            createMany: {
              // Create new ones
              data: dto.permissionIds.map((permissionId) => ({
                permissionId,
              })),
            },
          },
        }),
      },
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
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // 5. Invalidate caches and publish event
    await this.cacheInvalidationService.invalidateGroupRoleCache(groupId);
    await this.cacheInvalidationService.invalidateAllPermissionsCache();
    await this.cacheInvalidationService.publishRoleChangeEvent(
      groupId,
      updated.id,
      updated.name,
    );

    // Invalidate whoami/menu/permissions cache and broadcast event for all users assigned to this role
    if (updated.users && updated.users.length > 0) {
      for (const user of updated.users) {
        // Invalidate all menu caches for the user
        await this.cacheInvalidationService.invalidateUserAllMenuCaches(user.id);
        // Invalidate all permissions cache for the user (across all entities, if needed)
        // If you have entity-specific permissions, you may need to loop entities here
        // Optionally, broadcast a user-role-changed event
        await this.cacheInvalidationService.publishUserRoleChangeEvent(
          groupId,
          user.id,
          updated.id,
          updated.name,
        );
      }
    }

    return this.formatRoleResponse(updated);
  }

  /**
   * Delete a role
   * Prevent deletion if role has users assigned
   */
  async deleteRole(groupId: string, roleId: string) {
    // 1. Verify role exists and belongs to group
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        users: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.groupId !== groupId) {
      throw new ForbiddenException('You do not have access to this role');
    }

    // Prevent deletion of system roles
    if (role.isSystemRole) {
      throw new ForbiddenException('System roles cannot be deleted');
    }

    // Prevent deletion if role has users
    if (role.users.length > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" as it has ${role.users.length} user(s) assigned. Reassign or remove users first.`,
      );
    }

    // 2. Delete the role (cascade deletes will remove RolePermission entries)
    await this.prisma.role.delete({
      where: { id: roleId },
    });

    // 3. Invalidate caches and publish event
    await this.cacheInvalidationService.invalidateGroupRoleCache(groupId);
    await this.cacheInvalidationService.invalidateAllPermissionsCache();
    await this.cacheInvalidationService.publishRoleChangeEvent(
      groupId,
      roleId,
      role.name,
      { action: 'role-deleted' },
    );

    return {
      message: `Role "${role.name}" has been deleted successfully`,
    };
  }

  /**
   * ============================================
   * PRIVATE VALIDATION METHODS
   * ============================================
   */

  /**
   * Validate that all permissions match the role's scope
   * - USER scope: only ENTITY and GROUP modules allowed
   * - ADMIN scope: only GROUP and ENTITY modules allowed
   */
  private validatePermissionsByScope(
    permissions: any[],
    scope: RoleScope,
  ): void {
    for (const perm of permissions) {
      const moduleScope = perm.action.module.scope;

      if (scope === RoleScope.USER) {
        // USER scope: must use ENTITY or GROUP modules, NOT SUPERADMIN
        if (moduleScope === ModuleScope.SUPERADMIN) {
          throw new BadRequestException(
            `User-scoped roles cannot have ${perm.action.module.displayName} permissions (${moduleScope} module)`,
          );
        }
      } else if (scope === RoleScope.ADMIN) {
        // ADMIN scope: can use GROUP and ENTITY, NOT SUPERADMIN
        if (moduleScope === ModuleScope.SUPERADMIN) {
          throw new BadRequestException(
            `Admin-scoped roles cannot have ${perm.action.module.displayName} permissions (${moduleScope} module)`,
          );
        }
      }
    }
  }

  /**
   * Auto-add view permissions if missing for any module
   * If user selects items:import, auto-add items:view
   * Returns enhanced permission ID array
   *
   * Example flow:
   * - Input: [perm_items_import]
   * - Detects: items module has import but no view
   * - Fetches: items:view permission ID
   * - Returns: [perm_items_import, perm_items_view]
   */
  private async ensureViewPermissionsAdded(
    permissionIds: string[],
    permissions: any[],
    groupId: string,
  ): Promise<string[]> {
    // Group permissions by module and action
    const permissionsByModule = new Map<
      string,
      { action: string; permission: any; permId: string }[]
    >();

    // Build map of current permissions
    for (let i = 0; i < permissions.length; i++) {
      const perm = permissions[i];
      const moduleKey = perm.action.module.moduleKey;
      const actionName = perm.action.actionName;

      if (!permissionsByModule.has(moduleKey)) {
        permissionsByModule.set(moduleKey, []);
      }

      permissionsByModule.get(moduleKey)!.push({
        action: actionName,
        permission: perm,
        permId: permissionIds[i],
      });
    }

    // Find modules with non-view actions but no view
    const modulesNeedingView: string[] = [];
    for (const [moduleKey, actions] of permissionsByModule.entries()) {
      const hasView = actions.some(
        (a) => a.action.toLowerCase() === PermissionAction.View.toLowerCase(),
      );
      const hasNonView = actions.some(
        (a) => a.action.toLowerCase() !== PermissionAction.View.toLowerCase(),
      );

      if (hasNonView && !hasView) {
        modulesNeedingView.push(moduleKey);
      }
    }

    // If no modules need view, return original IDs
    if (modulesNeedingView.length === 0) {
      return permissionIds;
    }

    // Fetch view permissions for modules that need them
    const viewPermissions = await this.prisma.permission.findMany({
      where: {
        action: {
          module: {
            moduleKey: { in: modulesNeedingView },
          },
          actionName: PermissionAction.View,
        },
      },
      select: { id: true },
    });

    // Add the view permission IDs to the array
    const enhancedIds = [...permissionIds];
    for (const viewPerm of viewPermissions) {
      if (!enhancedIds.includes(viewPerm.id)) {
        enhancedIds.push(viewPerm.id);
      }
    }

    return enhancedIds;
  }

  /**
   * Format role response for API
   */
  private formatRoleResponse(role: any) {
    const permissionsByModule = new Map<string, any>();

    // Group permissions by module
    for (const rp of role.rolePermissions || []) {
      const moduleKey = rp.permission.action.module.moduleKey;
      const moduleName = rp.permission.action.module.displayName;
      const action = rp.permission.action.actionName;

      if (!permissionsByModule.has(moduleKey)) {
        permissionsByModule.set(moduleKey, {
          moduleKey,
          moduleName,
          actions: [],
          permissions: [], // Also return raw permission IDs for reference
        });
      }

      permissionsByModule.get(moduleKey).actions.push(action);
      permissionsByModule.get(moduleKey).permissions.push(rp.permission.id);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      scope: role.scope,
      groupId: role.groupId,
      isSystemRole: role.isSystemRole,
      permissions: Array.from(permissionsByModule.values()),
      permissionIds: (role.rolePermissions || []).map((rp: any) => rp.permission.id),
      usersCount: role.users?.length || 0,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Get all permissions organized by module
   * Used by frontend to build permission selector UI
   * 
   * Response structure:
   * [
   *   {
   *     moduleId: "mod_1",
   *     moduleKey: "items",
   *     moduleName: "Inventory Items",
   *     scope: "ENTITY",
   *     actions: [
   *       { id: "perm_1", actionName: "View", actionId: "act_1" },
   *       { id: "perm_2", actionName: "Create", actionId: "act_2" },
   *       ...
   *     ]
   *   },
   *   ...
   * ]
   */
  /**
   * Get all permissions, optionally filtered by scope
   * Cached: 24 hours (permissions rarely change unless new modules/actions added)
   * @param scope - 'admin' returns GROUP-scope permissions, 'user' returns ENTITY-scope permissions, undefined returns all
   */
  async getAllPermissions(scope?: 'admin' | 'user') {
    // Build cache key based on scope
    const cacheKey = scope ? `permissions:all:${scope}` : 'permissions:all';

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      console.log(`✓ Permissions cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`⚡ Permissions cache MISS: ${cacheKey} - Computing...`);

    // Use cached module service instead of direct database query
    const modules = await this.moduleService.getAllModules();

    // Filter by scope if provided
    let filteredModules = modules;
    if (scope === 'admin') {
      filteredModules = modules.filter((m) => m.scope === 'GROUP');
    } else if (scope === 'user') {
      filteredModules = modules.filter((m) => m.scope === 'ENTITY');
    }

    const permissions = filteredModules.map((module) => ({
      moduleId: module.id,
      moduleKey: module.moduleKey,
      moduleName: module.displayName,
      menu: module.menu,
      scope: module.scope,
      actions: module.actions.map((action) => ({
        id: action.permissionId, // permissionId already extracted by module service
        actionName: action.actionName,
        actionId: action.id,
      })),
    }));

    // Cache for 24 hours (permissions rarely change)
    await this.cacheService.set(cacheKey, permissions, { ttl: 86400 });
    console.log(`✓ Permissions cached: ${cacheKey} (TTL: 24h)`);

    return permissions;
  }

    /**
   * Get role stats for a group: systemRoles, customRoles, totalRoles
   */
  async getRoleStatsByGroup(groupId: string) {
    const systemRoles = await this.prisma.role.count({ where: { groupId, isSystemRole: true } });
    const customRoles = await this.prisma.role.count({ where: { groupId, isSystemRole: false } });
    const totalRoles = systemRoles + customRoles;
    return { systemRoles, customRoles, totalRoles };
  }
}

import { CacheService } from '@/cache/cache.service';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '@/subscription/subscription.service';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  module?: string;
  menu?: string; // Menu category from Module model (e.g., "Income", "Accounting")
  actions?: string[];
  menuSortOrder?: number; // For ordering within the same menu category
  moduleSortOrder?: number; // For ordering modules when no menu category is defined
}

export interface ModuleMenu {
  moduleKey: string;
  displayName: string;
  actions: string[];
}

export interface MenuGroup {
  groupName: string;
  modules: ModuleMenu[];
}

export interface ComputedMenu {
  adminMenus: MenuGroup[];
  entityMenus: MenuGroup[];
}

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService,
    private cacheService: CacheService,
    private subscriptionService: SubscriptionService,
  ) {}

 
  /**
   * Get user's permissions by module
   * Returns map of moduleKey -> actionNames[]
   */
  async getUserPermissions(user: any): Promise<Record<string, string[]>> {
   
    if (!user) {
      throw new Error(`User ${user.id} not found`);
    }

    const permissions: Record<string, string[]> = {};

    // Add explicit permissions (if they exist)
    (user.explicitPermissions || []).forEach((ep) => {
      const moduleKey = ep.permission.action.module.moduleKey;
      const actionName = ep.permission.action.actionName;

      if (!permissions[moduleKey]) {
        permissions[moduleKey] = [];
      }
      if (ep.allowed && !permissions[moduleKey].includes(actionName)) {
        permissions[moduleKey].push(actionName);
      }
    });

    // Add role permissions
    if (user.role) {
      const rolePerms = await this.prisma.rolePermission.findMany({
        where: { roleId: user.role.id },
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
      });

      rolePerms.forEach((rp) => {
        const moduleKey = rp.permission.action.module.moduleKey;
        const actionName = rp.permission.action.actionName;

        if (!permissions[moduleKey]) {
          permissions[moduleKey] = [];
        }
        if (!permissions[moduleKey].includes(actionName)) {
          permissions[moduleKey].push(actionName);
        }
      });
    }

    return permissions;
  }

  /**
   * Build menu cache key with smart handling of null/undefined values
   * groupId null → 'system'
   * entityId null/undefined → 'all'
   * Examples:
   * - Superadmin no context: menu:user1:system:all
   * - Superadmin + group: menu:user1:group1:all
   * - Superadmin + group + entity: menu:user1:group1:entity1
   */
  private buildMenuCacheKey(userId: string, groupId?: string, entityId?: string): string {
    const g = groupId || 'system';
    const e = entityId || 'all';
    return `menu:${userId}:${g}:${e}`;
  }

  /**
   * Get complete organized menu for a user with Redis caching
   * Returns hierarchical menu structure with subgroups
   * 
   * Cache Strategy:
   * - Key: menu:{userId}:{groupId||system}:{entityId||all}
   * - TTL: 5 minutes (300 seconds)
   * - Invalidated on: permission change, role assignment, subscription change
   */
  async getMenuForUser(user: any, entityId?: string, groupId?: string): Promise<MenuItem[]> {
    if (!user) {
      return [];
    }

    const userId = user.id;
    const isSuperadmin = user.systemRole === 'superadmin';
    const isAdmin = user.systemRole === 'admin';

    // Build cache key
    const cacheKey = this.buildMenuCacheKey(userId, groupId, entityId);

    // Check Redis cache first
    const cached = await this.cacheService.get<MenuItem[]>(cacheKey);
    if (cached) {
      console.log(`✓ Menu cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`⚡ Menu cache MISS: ${cacheKey} - Computing menu...`);

    let menus: MenuItem[] = [];

    // SUPERADMIN with no group/entity context: show superadmin menu
    if (isSuperadmin && !entityId && !groupId) {
      menus = await this.buildSuperAdminMenu(await this.prisma.module.findMany());
      // Cache before return
      await this.cacheService.set(cacheKey, menus, { ttl: 300 });
      return menus;
    }

    // All other contexts require groupId
    if (!groupId) {
      return [];
    }

    // Get available modules from subscription
    const availableModules = await this.subscriptionService.getAvailableModules(groupId);

    // Load entity's disabled module IDs (applies to all users including superadmin)
    let disabledModuleIds: string[] = [];
    if (entityId) {
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { disabledModuleIds: true },
      });
      disabledModuleIds = entity?.disabledModuleIds ?? [];
    }

    // SUPERADMIN: Show all subscription modules (no permission filtering)
    if (isSuperadmin) {
      if (entityId) {
        menus = await this.buildEntityMenu(availableModules, {}, disabledModuleIds);
      } else {
        menus = await this.buildAdminMenu(availableModules, {});
      }
    } else {
      if (!user.role) {
        return [];
      }

      const userPermissions = await this.getUserPermissions(user);

      if (isAdmin) {
        if (entityId) {
          menus = await this.buildEntityMenu(availableModules, userPermissions, disabledModuleIds);
        } else {
          menus = await this.buildAdminMenu(availableModules, userPermissions);
        }
      } else {
        menus = await this.buildEntityMenu(availableModules, userPermissions, disabledModuleIds);
      }
    }

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, menus, { ttl: 300 });
    console.log(`✓ Menu cached: ${cacheKey} (TTL: 300s)`);

    return menus;
  }

  /**
   * Invalidate menu cache for a user
   * Used when permissions, roles, or subscriptions change
   */
  async invalidateMenuCache(userId: string, groupId?: string, entityId?: string): Promise<void> {
    const cacheKey = this.buildMenuCacheKey(userId, groupId, entityId);
    await this.cacheService.delete(cacheKey);
    console.log(`✓ Menu cache invalidated: ${cacheKey}`);
  }

  /**
   * Invalidate all menu cache variations for a user in a group
   * Useful when group-level changes affect all entities
   */
  async invalidateGroupMenuCache(userId: string, groupId: string): Promise<void> {
    // Invalidate: menu:userId:groupId:all (group context)
    await this.invalidateMenuCache(userId, groupId);
    
    // For entity-specific invalidation, caller should call with entityId
    // Pattern deletion would be here if CacheService supports it
  }

  /**
   * Get complete organized menu for a user
   * Returns hierarchical menu structure with subgroups (DEPRECATED - use getMenuForUser)
   * @deprecated Use getMenuForUser() instead which includes caching functionality

  /**
   * Build admin menu (GROUP-scope modules)
   * For SUPERADMIN: Shows all GROUP-scope modules (no permission check)
   * For ADMIN: Shows GROUP-scope modules where user has ANY permission
   */
  private async buildAdminMenu(
    availableModules: any[],
    permissions: Record<string, string[]>,
  ): Promise<MenuItem[]> {
    const groupModules = availableModules.filter((m) => m.scope === 'GROUP');

    const menu: MenuItem[] = [];

    for (const module of groupModules) {
      // Show menu item if: permissions is empty (SUPERADMIN bypass) OR user has permission
      const hasModuleAccess =
        Object.keys(permissions).length === 0 || // SUPERADMIN: no permission filtering
        (permissions[module.moduleKey] &&
          permissions[module.moduleKey].length > 0); // ADMIN: check permission

      if (!hasModuleAccess) {
        continue;
      }

      // Build menu item (no menuCategory yet - will be determined during organization)
      const menuItem = await this.createMenuItemFromModule(module, permissions);
      menu.push(menuItem);
    }

    return this.organizeAdminMenu(menu);
  }

  /**
   * Build entity menu (ENTITY-scope modules)
   * For SUPERADMIN: Shows all ENTITY-scope modules (no permission check)
   * For others: Shows ENTITY-scope modules where user has ANY permission
   */
  private async buildEntityMenu(
    availableModules: any[],
    permissions: Record<string, string[]>,
    disabledModuleIds: string[] = [],
  ): Promise<MenuItem[]> {
    const entityModules = availableModules.filter((m) => m.scope === 'ENTITY');

    const menu: MenuItem[] = [];

    for (const module of entityModules) {
      // Skip modules disabled by the entity admin
      if (disabledModuleIds.includes(module.id)) {
        continue;
      }

      // Show menu item if: permissions is empty (SUPERADMIN bypass) OR user has permission
      const hasModuleAccess =
        Object.keys(permissions).length === 0 ||
        (permissions[module.moduleKey] && permissions[module.moduleKey].length > 0);

      if (!hasModuleAccess) {
        continue;
      }

      const menuItem = await this.createMenuItemFromModule(module, permissions);
      menu.push(menuItem);
    }

    return this.organizeEntityMenu(menu);
  }


  /**
   * Build superadmin menu (superadmin-scope modules)
   * for superadmin dashboard
   */
  private async buildSuperAdminMenu(
    availableModules: any[],
  ): Promise<MenuItem[]> {
    console.log(availableModules.length, "available modules for superadmin menu");
    const superAdminModules = availableModules.filter((m) => m.scope === 'SUPERADMIN');

    const menu: MenuItem[] = [];

    for (const module of superAdminModules) {
     

      // Build menu item (no menuCategory yet - will be determined during organization)
      const menuItem = await this.createMenuItemFromModule(module, {});
      menu.push(menuItem);
    }

    return this.organizeEntityMenu(menu);
  }

  /**
   * Convert camelCase or snake_case to kebab-case
   * Examples:
   * - auditTrail → audit-trail
   * - master_chart_of_accounts → master-chart-of-accounts
   * - Master Data → master-data (spaces to hyphens)
   * - Sales & Purchases → sales-and-purchases (& to and)
   */
  private convertToKebabCase(str: string): string {
    return str
      // Replace & with "and"
      .replace(/&/g, 'and')
      // Handle camelCase: insert hyphen before uppercase letters
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      // Handle snake_case: replace underscores with hyphens
      .replace(/_/g, '-')
      // Handle spaces: replace with hyphens
      .replace(/\s+/g, '-')
      // Convert to lowercase
      .toLowerCase()
      // Remove any duplicate hyphens
      .replace(/-+/g, '-');
  }

  /**
   * Generate route based on module structure
   * Parses module keys by removing scope prefixes:
   * - entityDashboard -> dashboard
   * - entitySettings -> settings
   * - groupSettings -> settings
   * - superadminDashboard -> dashboard
   * - groupDashboard -> dashboard
   * 
   * Single module: /audit-trail or /dashboard
   * Grouped modules: /accounting/master-chart-of-accounts
   */
  private generateMenuRoute(module: any, menuCategory?: string): string {
    // Extract route name by removing scope prefix (entity, group, superadmin)
    let routeName = module.moduleKey;
    const prefixes = ['superadmin', 'group', 'entity']; // Order matters: longest first
    
    for (const prefix of prefixes) {
      if (routeName.toLowerCase().startsWith(prefix.toLowerCase())) {
        routeName = routeName.slice(prefix.length);
        break;
      }
    }
    
    const moduleKeySlug = this.convertToKebabCase(routeName);

    // If no menu category or only one child, use just moduleKey
    if (!menuCategory) {
      return `/${moduleKeySlug}`;
    }

    // Multiple children: use menu/moduleKey format
    const menuSlug = this.convertToKebabCase(menuCategory);
    return `/${menuSlug}/${moduleKeySlug}`;
  }

  /**
   * Create menu item from module + available actions
   * For SUPERADMIN (empty permissions object): show all module actions
   * For others: show only their permitted actions
   */
  private async createMenuItemFromModule(
    module: any,
    permissions: Record<string, string[]>,
    menuCategory?: string,
  ): Promise<MenuItem> {
    let actions = permissions[module.moduleKey] || [];

    // If superadmin (empty permissions), get ALL available actions for this module
    if (Object.keys(permissions).length === 0) {
      const allModuleActions = await this.prisma.action.findMany({
        where: { moduleId: module.id },
      });
      actions = allModuleActions.map((a) => a.actionName);
    }

    return {
      id: module.id,
      label: module.displayName,
      icon: module.icon,
      route: this.generateMenuRoute(module, menuCategory),
      module: module.moduleKey,
      menu: module.menu,
      menuSortOrder: module.menuSortOrder,
      moduleSortOrder: module.moduleSortOrder,
      actions,
    };
  }

  /**
   * Organize ENTITY menus into groups/submenus based on Module.menu field
   * Updates routes based on whether items are single or grouped
   */
  private organizeEntityMenu(items: MenuItem[]): MenuItem[] {
    // Group items by their menu category
    const menuGroups = new Map<string, MenuItem[]>();
    
    for (const item of items) {
      const menuCategory = item.menu || 'Other';
      if (!menuGroups.has(menuCategory)) {
        menuGroups.set(menuCategory, []);
      }
      menuGroups.get(menuCategory)!.push(item);
    }

    // Convert map to organized menu structure
    const organized: MenuItem[] = [];
    for (const [groupName, groupItems] of menuGroups) {
      // Sort items within the group by moduleSortOrder
      groupItems.sort((a, b) => (a.moduleSortOrder || 0) - (b.moduleSortOrder || 0));

      // If only one item in this group, use single route; otherwise use grouped route
      if (groupItems.length === 1) {
        // Single item: use just the moduleKey route
        groupItems[0].route = this.generateMenuRoute({
          moduleKey: groupItems[0].module,
        });
        organized.push(groupItems[0]);
      } else {
        // Multiple items: group them with category route
        const updatedItems = groupItems.map((item) => ({
          ...item,
          route: this.generateMenuRoute(
            { moduleKey: item.module },
            groupName,
          ),
        }));
        organized.push({
          id: groupName,
          label: groupName,
          menuSortOrder: groupItems[0].menuSortOrder, // Sort groups by the first module's sort order
          children: updatedItems,
        });
      }
    }

    // Sort the organized menu groups by menuSortOrder
    organized.sort((a, b) => (a.menuSortOrder || 0) - (b.menuSortOrder || 0));

    return organized;
  }

  /**
   * Organize GROUP (admin) menus into groups/submenus based on Module.menu field
   * Updates routes based on whether items are single or grouped
   */
  private organizeAdminMenu(items: MenuItem[]): MenuItem[] {
    // Group items by their menu category from Module.menu
    const menuGroups = new Map<string, MenuItem[]>();
    
    for (const item of items) {
      const menuCategory = item.menu || 'Other';
      if (!menuGroups.has(menuCategory)) {
        menuGroups.set(menuCategory, []);
      }
      menuGroups.get(menuCategory)!.push(item);
    }

    // Convert map to organized menu structure
    const organized: MenuItem[] = [];
    for (const [groupName, groupItems] of menuGroups) {
      // Sort items within the group by moduleSortOrder
      groupItems.sort((a, b) => (a.moduleSortOrder || 0) - (b.moduleSortOrder || 0));

      // If only one item in this group, use single route; otherwise use grouped route
      if (groupItems.length === 1) {
        // Single item: use just the moduleKey route
        groupItems[0].route = this.generateMenuRoute({
          moduleKey: groupItems[0].module,
        });
        organized.push(groupItems[0]);
      } else {
        // Multiple items: group them with category route
        const updatedItems = groupItems.map((item) => ({
          ...item,
          route: this.generateMenuRoute(
            { moduleKey: item.module },
            groupName,
          ),
        }));
        organized.push({
          id: groupName,
          label: groupName,
          menuSortOrder: groupItems[0].menuSortOrder, // Sort groups by the first module's sort order
          children: updatedItems,
        });
      }
    }

    // Sort the organized menu groups by menuSortOrder
    organized.sort((a, b) => (a.menuSortOrder || 0) - (b.menuSortOrder || 0));

    return organized;
  }

  /**
   * Get available actions for a module that user can perform
   */
  async getAvailableActionsForModule(
    user: any,
    moduleKey: string,
  ): Promise<string[]> {
    const permissions = await this.getUserPermissions(user);
    return permissions[moduleKey] || [];
  }
}

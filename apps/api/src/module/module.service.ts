import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import { ModuleScope } from 'prisma/generated/enums';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

/**
 * Module Service
 *
 * Handles retrieval, creation, update, and deletion of system modules with caching.
 * Modules are the core building blocks of the system (Items, Invoices, etc.)
 *
 * Cache Strategy:
 * - All modules cached with version-based keys
 * - Cache invalidated on any create/update/delete operation
 * - Version automatically incremented, old cache keys orphaned
 */
@Injectable()
export class ModuleService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private cacheInvalidation: CacheInvalidationService,
  ) {}

  /**
   * Get all modules organized by scope with optional version checking
   *
   * Response includes:
   * - All system modules
   * - Actions available in each module
   * - Module scope (SUPERADMIN, GROUP, ENTITY)
   *
   * Cache TTL: 30 minutes (modules rarely change)
   * Cache key: `modules:all:v${version}`
   *
   * @param moduleVersion - Optional version number to validate cache freshness
   * @returns Array of modules with actions
   */
  async getAllModules(moduleVersion?: number): Promise<any[]> {
    // Build cache key
    const cacheKeyBase = `modules:all`;
    const cacheKey = moduleVersion
      ? `${cacheKeyBase}:v${moduleVersion}`
      : cacheKeyBase;

    // Check cache first
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      console.log(`✅ Modules cache hit: ${cacheKey}`);
      return cached;
    }

    console.log(`📊 Fetching modules from database (cache miss: ${cacheKey})`);

    // Fetch from database
    const modules = await this.prisma.module.findMany({
      where: {
        // Exclude SUPERADMIN modules from regular listing (optional, can be included if needed)
        scope: { not: ModuleScope.SUPERADMIN },
      },
      include: {
        actions: {
          include: {
            permissions: {
              select: { id: true },
            },
          },
          orderBy: { actionName: 'asc' },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    // Transform to response format
    const result = modules.map((module) => ({
      id: module.id,
      moduleKey: module.moduleKey,
      displayName: module.displayName,
      description: module.description || null,
      scope: module.scope,
      menu: module.menu,
      actions: module.actions.map((action) => ({
        id: action.id,
        actionName: action.actionName,
        permissionId: action.permissions[0]?.id,
      })),
    }));

    // Cache with TTL: 30 minutes
    await this.cacheService.set(cacheKey, result, { ttl: 1800 });
    console.log(`✅ Modules cached: ${cacheKey} (TTL: 30min)`);

    return result;
  }

  /**
   * Get modules filtered by scope
   *
   * @param scope - SUPERADMIN, GROUP, or ENTITY
   * @param moduleVersion - Optional version number
   * @returns Array of modules for the specified scope
   */
  async getModulesByScope(
    scope: ModuleScope,
    moduleVersion?: number,
    optional?: string,
    entityId?: string,
  ): Promise<any[]> {
    // When fetching optional modules with an entity context, skip cache
    // because isMenuVisible is entity-specific
    const isEntitySpecific = optional === 'True' && !!entityId;

    const cacheKeyBase = `modules:scope:${scope.toLowerCase()}`;
    const cacheKey = moduleVersion
      ? `${cacheKeyBase}:v${moduleVersion}`
      : cacheKeyBase;

    if (!isEntitySpecific) {
      const cached = await this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        console.log(`✅ Modules (${scope}) cache hit: ${cacheKey}`);
        return cached;
      }
    }

    console.log(`📊 Fetching ${scope} scope modules from database`);

    const where: any = { scope };
    if (optional === 'True') where.isOptional = true;
    if (optional === 'False') where.isOptional = false;

    const modules = await this.prisma.module.findMany({
      where,
      include: {
        actions: {
          include: { permissions: { select: { id: true } } },
          orderBy: { actionName: 'asc' },
        },
      },
      orderBy: { menuSortOrder: 'asc' },
    });

    // Load entity's disabled module IDs when entity context is present
    let disabledModuleIds: string[] = [];
    if (isEntitySpecific) {
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { disabledModuleIds: true },
      });
      disabledModuleIds = entity?.disabledModuleIds ?? [];
    }

    const result = modules.map((module) => ({
      id: module.id,
      moduleKey: module.moduleKey,
      displayName: module.displayName,
      description: module.description || null,
      scope: module.scope,
      menu: module.menu,
      isMenuVisible: !disabledModuleIds.includes(module.id),
      actions: module.actions.map((action) => ({
        id: action.id,
        actionName: action.actionName,
        permissionId: action.permissions[0]?.id,
      })),
    }));

    // Only cache non-entity-specific results
    if (!isEntitySpecific) {
      await this.cacheService.set(cacheKey, result, { ttl: 1800 });
    }

    return result;
  }

  /**
   * Get a single module by key with its actions
   *
   * @param moduleKey - e.g., "items", "invoices", "bills"
   * @param moduleVersion - Optional version number
   * @returns Module details with actions
   */
  async getModuleByKey(
    moduleKey: string,
    moduleVersion?: number,
  ): Promise<any> {
    const cacheKeyBase = `module:${moduleKey}`;
    const cacheKey = moduleVersion
      ? `${cacheKeyBase}:v${moduleVersion}`
      : cacheKeyBase;

    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      console.log(`✅ Module (${moduleKey}) cache hit: ${cacheKey}`);
      return cached;
    }

    const module = await this.prisma.module.findFirst({
      where: { moduleKey },
      include: {
        actions: {
          include: {
            permissions: {
              select: { id: true },
            },
          },
          orderBy: { actionName: 'asc' },
        },
      },
    });

    if (!module) {
      return null;
    }

    const result = {
      id: module.id,
      moduleKey: module.moduleKey,
      displayName: module.displayName,
      description: module.description || null,
      scope: module.scope,
      menu: module.menu,
      actions: module.actions.map((action) => ({
        id: action.id,
        actionName: action.actionName,
        permissionId: action.permissions[0]?.id,
      })),
    };

    // Cache with TTL: 30 minutes
    await this.cacheService.set(cacheKey, result, { ttl: 1800 });

    return result;
  }

  /**
   * Create a new module with the provided details
   *
   * Automatically invalidates all module caches by incrementing the module version.
   * This ensures the new module appears in all subsequent requests.
   *
   * @param createModuleDto - Module creation data
   * @returns Created module object
   * @throws ConflictException if moduleKey + scope combination already exists
   */
  async createModule(createModuleDto: CreateModuleDto): Promise<any> {
    const {
      moduleKey,
      displayName,
      description,
      scope = ModuleScope.ENTITY,
      menu,
      isMenuVisible = true,
    } = createModuleDto;

    // Check if module already exists
    const existingModule = await this.prisma.module.findFirst({
      where: {
        moduleKey,
        scope,
      },
    });

    if (existingModule) {
      throw new ConflictException(
        `Module with key "${moduleKey}" already exists in scope "${scope}". Module keys must be unique within their scope.`,
      );
    }

    // Create the module
    const createdModule = await this.prisma.module.create({
      data: {
        moduleKey,
        displayName,
        description: description || null,
        scope,
        menu,
      },
      include: {
        actions: {
          include: {
            permissions: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Transform response
    const result = {
      id: createdModule.id,
      moduleKey: createdModule.moduleKey,
      displayName: createdModule.displayName,
      description: createdModule.description,
      scope: createdModule.scope,
      menu: createdModule.menu,
      isMenuVisible,
      actions: createdModule.actions.map((action) => ({
        id: action.id,
        actionName: action.actionName,
        permissionId: action.permissions[0]?.id,
      })),
      createdAt: createdModule.createdAt,
      updatedAt: createdModule.updatedAt,
    };

    // Invalidate all module caches by incrementing version
    await this.cacheInvalidation.incrementModuleVersion();
    console.log(`✅ Module created: ${moduleKey} (scope: ${scope})`);

    return result;
  }

  /**
   * Update an existing module
   *
   * Allows partial updates - only the specified fields are changed.
   * Automatically invalidates all module caches by incrementing the module version.
   *
   * @param moduleId - ID of the module to update
   * @param updateModuleDto - Update data (all fields optional)
   * @returns Updated module object
   * @throws NotFoundException if module doesn't exist
   */
  async updateModule(
    moduleId: string,
    updateModuleDto: UpdateModuleDto,
  ): Promise<any> {
    // Check if module exists
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        actions: {
          include: {
            permissions: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID "${moduleId}" not found`);
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {};
    if (updateModuleDto.displayName !== undefined) {
      updateData.displayName = updateModuleDto.displayName;
    }
    if (updateModuleDto.description !== undefined) {
      updateData.description = updateModuleDto.description;
    }
    if (updateModuleDto.scope !== undefined) {
      updateData.scope = updateModuleDto.scope;
    }
    if (updateModuleDto.menu !== undefined) {
      updateData.menu = updateModuleDto.menu;
    }

    // Update the module
    const updatedModule = await this.prisma.module.update({
      where: { id: moduleId },
      data: updateData,
      include: {
        actions: {
          include: {
            permissions: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Transform response
    const result = {
      id: updatedModule.id,
      moduleKey: updatedModule.moduleKey,
      displayName: updatedModule.displayName,
      description: updatedModule.description,
      scope: updatedModule.scope,
      menu: updatedModule.menu,
      actions: updatedModule.actions.map((action) => ({
        id: action.id,
        actionName: action.actionName,
        permissionId: action.permissions[0]?.id,
      })),
      createdAt: updatedModule.createdAt,
      updatedAt: updatedModule.updatedAt,
    };

    // Invalidate all module caches by incrementing version
    await this.cacheInvalidation.incrementModuleVersion();
    console.log(
      `✅ Module updated: ${updatedModule.moduleKey} (ID: ${moduleId})`,
    );

    return result;
  }

  /**
   * Delete a module by ID
   *
   * Deletes the module and all associated actions and permissions.
   * Automatically invalidates all module caches.
   *
   * WARNING: Deletion is cascading - all actions and permissions for this module
   * will be deleted. This may break existing role configurations.
   *
   * @param moduleId - ID of the module to delete
   * @returns Deleted module object
   * @throws NotFoundException if module doesn't exist
   */
  async deleteModule(moduleId: string): Promise<any> {
    // Check if module exists
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        actions: {
          include: {
            permissions: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID "${moduleId}" not found`);
    }

    // Delete the module (cascading delete handles actions and permissions)
    const deletedModule = await this.prisma.module.delete({
      where: { id: moduleId },
      include: {
        actions: {
          include: {
            permissions: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Transform response
    const result = {
      id: deletedModule.id,
      moduleKey: deletedModule.moduleKey,
      displayName: deletedModule.displayName,
      description: deletedModule.description,
      scope: deletedModule.scope,
      menu: deletedModule.menu,
      actions: deletedModule.actions.map((action) => ({
        id: action.id,
        actionName: action.actionName,
        permissionId: action.permissions[0]?.id,
      })),
      createdAt: deletedModule.createdAt,
      updatedAt: deletedModule.updatedAt,
    };

    // Invalidate all module caches by incrementing version
    await this.cacheInvalidation.incrementModuleVersion();
    console.log(
      `✅ Module deleted: ${deletedModule.moduleKey} (ID: ${moduleId})`,
    );

    return result;
  }
}

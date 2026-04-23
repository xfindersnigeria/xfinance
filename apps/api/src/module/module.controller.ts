import { Controller, Get, Post, Patch, Delete, Query, Body, Param, Req, UseGuards, BadRequestException, HttpStatus } from '@nestjs/common';
import { ModuleService } from './module.service';
import { ModuleScope, systemRole } from 'prisma/generated/enums';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { AuthGuard } from '@/auth/guards/auth.guard';

/**
 * Module Controller
 * 
 * Endpoints for retrieving system modules and their actions.
 * All endpoints are cached with version-based invalidation.
 */
@Controller('modules')
@UseGuards(AuthGuard)
export class ModuleController {
  constructor(private moduleService: ModuleService) {}

  /**
   * GET /modules/all
   * 
   * Fetch all system modules with their actions organized by scope.
   * 
   * Query Parameters:
   * - moduleVersion (optional): Version number for cache validation
   *   - Used for handling cache invalidation
   *   - When module data changes, moduleVersion increments
   *   - Old cache keys become orphaned, fresh request gets new version
   *   - Example: GET /modules/all?moduleVersion=5
   * 
   * Response Example:
   * ```json
   * [
   *   {
   *     "id": "module-1",
   *     "moduleKey": "items",
   *     "displayName": "Items Master",
   *     "description": "Manage all inventory items",
   *     "scope": "ENTITY",
   *     "icon": "🎁",
   *     "menu": true,
   *     "actions": [
   *       {
   *         "id": "action-1",
   *         "actionName": "view",
   *         "description": "View items",
   *         "permissionId": "permission-1"
   *       },
   *       {
   *         "id": "action-2",
   *         "actionName": "create",
   *         "description": "Create new items",
   *         "permissionId": "permission-2"
   *       }
   *     ]
   *   }
   * ]
   * ```
   * 
   * Cache Strategy:
   * - Key: `modules:all:v${moduleVersion}` (when version provided)
   * - Key: `modules:all` (when no version provided)
   * - TTL: 1800 seconds (30 minutes)
   * - Invalidation: When moduleVersion increments, old cache orphaned
   * 
   * HTTP Status Codes:
   * - 200: Success, modules returned
   * - 401: Unauthorized (JWT invalid)
   * 
   * Performance:
   * - First request: ~150-200ms (database query)
   * - Subsequent requests: ~5-10ms (Redis cache hit)
   * 
   * Use Cases:
   * - Build permission selector dropdowns
   * - Populate module multi-select fields
   * - Permission mapping and role configuration
   * - Menu building (but also see /whoami/menu for user-specific menu)
   */
  @Get('all')
  async getAllModules(@Query('moduleVersion') moduleVersion?: string) {
    const version = moduleVersion ? parseInt(moduleVersion, 10) : undefined;
    return this.moduleService.getAllModules(version);
  }

  /**
   * GET /modules/scope/:scope
   * 
   * Fetch modules filtered by scope (SUPERADMIN, GROUP, or ENTITY)
   * 
   * Scope Values:
   * - SUPERADMIN: System-level modules (settings, user management)
   * - GROUP: Group-level modules (group settings, billing)
   * - ENTITY: Entity-level modules (invoices, items, accounts)
   * 
   * Query Parameters:
   * - moduleVersion (optional): Version number for cache validation
   * 
   * Response: Same structure as /modules/all, filtered by scope
   */
  @Get('scope/:scope')
  async getModulesByScope(
    @Param('scope') scope: string,
    @Query('moduleVersion') moduleVersion?: string,
    @Query('optional') optional?: string,
    @Req() req?: any,
  ) {
    const version = moduleVersion ? parseInt(moduleVersion, 10) : undefined;
    if (!Object.values(ModuleScope).includes(scope as ModuleScope)) {
      throw new BadRequestException(`Invalid scope: ${scope}. Must be one of: ${Object.values(ModuleScope).join(', ')}`);
    }
    // Pass entityId so service can compute isMenuVisible per entity when optional=True
    const entityId = req?.entityImpersonation?.entityId ?? req?.user?.entityId ?? undefined;
    return this.moduleService.getModulesByScope(scope as ModuleScope, version, optional, entityId);
  }

  /**
   * GET /modules/:moduleKey
   * 
   * Fetch a single module by its key with all its actions
   * 
   * Path Parameters:
   * - moduleKey: Module identifier (e.g., "items", "invoices", "billing")
   * 
   * Query Parameters:
   * - moduleVersion (optional): Version number for cache validation
   * 
   * Response: Single module object with nested actions
   */
  @Get(':moduleKey')
  async getModuleByKey(
    @Query('moduleKey') moduleKey: string,
    @Query('moduleVersion') moduleVersion?: string,
  ) {
    const version = moduleVersion ? parseInt(moduleVersion, 10) : undefined;
    return this.moduleService.getModuleByKey(moduleKey, version);
  }

  /**
   * POST /modules
   * 
   * Create a new module in the system
   * 
   * Authorization: Admin/Superadmin only (TODO: Add @UseGuards(RolesGuard) with admin check)
   * 
   * Request Body (CreateModuleDto):
   * ```json
   * {
   *   "moduleKey": "new_module",
   *   "displayName": "New Module",
   *   "description": "Optional description",
   *   "scope": "ENTITY",
   *   "menu": "Accounting",
   *   "isMenuVisible": true
   * }
   * ```
   * 
   * Response (201 Created):
   * ```json
   * {
   *   "id": "module-uuid",
   *   "moduleKey": "new_module",
   *   "displayName": "New Module",
   *   "description": "Optional description",
   *   "scope": "ENTITY",
   *   "menu": "Accounting",
   *   "actions": [],
   *   "createdAt": "2026-03-19T10:00:00Z",
   *   "updatedAt": "2026-03-19T10:00:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 201: Module created successfully
   * - 400: Validation error in request body
   * - 401: Unauthorized (JWT invalid)
   * - 403: Forbidden (user is not admin)
   * - 409: Conflict (moduleKey + scope combination already exists)
   * 
   * Cache Invalidation:
   * - Module version automatically incremented
   * - All existing module caches invalidated
   * - Next request to any /modules endpoint will fetch fresh data
   */
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin)
  async createModule(@Body() createModuleDto: CreateModuleDto) {
    // TODO: Add @UseGuards(RolesGuard) and @Roles('ADMIN', 'SUPERADMIN') decorators
    return this.moduleService.createModule(createModuleDto);
  }

  /**
   * PUT /modules/:id
   * 
   * Update an existing module
   * 
   * Authorization: Admin/Superadmin only (TODO: Add @UseGuards(RolesGuard) with admin check)
   * 
   * Path Parameters:
   * - id: Module ID (UUID)
   * 
   * Request Body (UpdateModuleDto - all fields optional):
   * ```json
   * {
   *   "displayName": "Updated Module Name",
   *   "description": "Updated description",
   *   "scope": "GROUP",
   *   "menu": "Settings",
   *   "isMenuVisible": false
   * }
   * ```
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "module-uuid",
   *   "moduleKey": "existing_module",
   *   "displayName": "Updated Module Name",
   *   "description": "Updated description",
   *   "scope": "GROUP",
   *   "menu": "Settings",
   *   "actions": [...],
   *   "createdAt": "2026-03-19T10:00:00Z",
   *   "updatedAt": "2026-03-19T10:05:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Module updated successfully
   * - 400: Validation error in request body
   * - 401: Unauthorized (JWT invalid)
   * - 403: Forbidden (user is not admin)
   * - 404: Module not found
   * 
   * Cache Invalidation:
   * - Module version automatically incremented
   * - All existing module caches invalidated
   * - Next request will fetch fresh data with updated values
   */
  @Patch(':id')
    @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin)

  async updateModule(@Param('id') id: string, @Body() updateModuleDto: UpdateModuleDto) {
    // TODO: Add @UseGuards(RolesGuard) and @Roles('ADMIN', 'SUPERADMIN') decorators
    return this.moduleService.updateModule(id, updateModuleDto);
  }

  /**
   * DELETE /modules/:id
   * 
   * Delete a module and all its associated actions and permissions
   * 
   * Authorization: Admin/Superadmin only (TODO: Add @UseGuards(RolesGuard) with admin check)
   * 
   * Path Parameters:
   * - id: Module ID (UUID)
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "module-uuid",
   *   "moduleKey": "deleted_module",
   *   "displayName": "Deleted Module",
   *   "description": "...",
   *   "scope": "ENTITY",
   *   "menu": "Accounting",
   *   "actions": [...],
   *   "createdAt": "2026-03-19T10:00:00Z",
   *   "updatedAt": "2026-03-19T10:05:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Module deleted successfully
   * - 401: Unauthorized (JWT invalid)
   * - 403: Forbidden (user is not admin)
   * - 404: Module not found
   * 
   * Cascading Delete:
   * - All associated Action records deleted
   * - All associated Permission records deleted
   * - All RolePermission mappings for those permissions deleted
   * 
   * WARNING: This will break existing roles that depend on this module's permissions.
   * Consider archiving modules instead of deleting them in production systems.
   * 
   * Cache Invalidation:
   * - Module version automatically incremented
   * - All existing module caches invalidated
   * - Next request will reflect the deletion
   */
  @Delete(':id')
    @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin)

  async deleteModule(@Param('id') id: string) {
    // TODO: Add @UseGuards(RolesGuard) and @Roles('ADMIN', 'SUPERADMIN') decorators
    return this.moduleService.deleteModule(id);
  }
}

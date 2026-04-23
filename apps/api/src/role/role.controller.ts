
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  /**
   * POST /roles
   * Create a new role
   * 
   * Request body:
   * {
   *   "name": "Sales Manager",
   *   "description": "Can create and approve sales documents",
   *   "scope": "USER",
   *   "permissionIds": [
   *     "permission_id_1",
   *     "permission_id_2",
   *     "permission_id_3"
   *   ]
   * }
   * 
   * Validation:
   * - name: required, 3-100 chars, unique within group/scope
   * - description: required, 3-500 chars
   * - scope: ADMIN or USER
   * - permissionIds: array required, at least 1 permission
   * - Module view permission rule: if any action is selected for a module, view must be included
   * - Scope validation: USER roles can't have SUPERADMIN permissions, ADMIN roles can't have SUPERADMIN
   */
  @Post()
  @UseGuards(AuthGuard)
  async createRole(@Req() req: any, @Body() dto: CreateRoleDto) {
    // Validate admin
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can create roles');
    }

    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to create roles');  
    }

    return this.roleService.createRole(effectiveGroupId, req.user.id, dto);
  }

   /**
   * GET /roles/stats
   * Returns number of system roles, custom roles, and total roles for the group
   */
  @Get('stats')
  @UseGuards(AuthGuard)
  async getRoleStats(@Req() req: any) {
    // Only admins can view stats
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view role stats');
    }
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to view role stats');
    }
    return this.roleService.getRoleStatsByGroup(effectiveGroupId);
  }

  /**
   * GET /roles
   *    * Get all roles for the group with optional search and pagination
   * 
   * Query Parameters:
   * - search: Filter by role name or description (optional, case-insensitive)
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10, max: 100)
   * 
   * Example:
   * GET /roles?search=accountant&page=1&limit=10
   */
  @Get()
  @UseGuards(AuthGuard)
  async getRoles(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // Validate admin
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view roles');
    }
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to view roles');  
    }

    return this.roleService.getRolesByGroup(effectiveGroupId, {
      search: search?.trim(),
      page: Math.max(1, parseInt(String(page), 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10)),
    });
  }

  /**
   * GET /roles/:id
   * Get a single role by ID
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async getRole(@Req() req: any, @Param('id') roleId: string) {
    // Validate admin
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view roles');
    }
        const effectiveGroupId = getEffectiveGroupId(req);

    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to view roles');  
    }

    return this.roleService.getRoleById(effectiveGroupId, roleId);
  }

  /**
   * PUT /roles/:id
   * Update a role
   * 
   * Request body (all optional):
   * {
   *   "name": "Updated Role Name",
   *   "description": "Updated description",
   *   "permissionIds": [
   *     "permission_id_1",
   *     "permission_id_2"
   *   ]
   * }
   * 
   * Notes:
   * - System roles cannot be modified
   * - Same validations apply as create
   */
  @Put(':id')
  @UseGuards(AuthGuard)
  async updateRole(
    @Req() req: any,
    @Param('id') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    // Validate admin
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update roles');
    }

        const effectiveGroupId = getEffectiveGroupId(req);
 if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to view roles');  
    }

    return this.roleService.updateRole(effectiveGroupId, roleId, req.user.id, dto);
  }

  /**
   * DELETE /roles/:id
   * Delete a role
   * 
   * Restrictions:
   * - Cannot delete if role has users assigned
   * - Cannot delete system roles
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteRole(@Req() req: any, @Param('id') roleId: string) {
    // Validate admin
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can delete roles');
    }

    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to delete roles');  
    }

    return this.roleService.deleteRole(effectiveGroupId, roleId);
  }

  /**
   * GET /roles/permissions/all
   * Get all available permissions organized by module
   * Cached: 24 hours (permissions rarely change)
   * Used by frontend to build permission selector checkboxes
   * 
   * Query Parameters:
   * - scope: Filter by 'admin' (GROUP-scope) or 'user' (ENTITY-scope), optional
   * 
   * Response: Array of modules with their actions and permission IDs
   * [
   *   {
   *     moduleId: "mod_1",
   *     moduleKey: "items",
   *     moduleName: "Inventory Items",
   *     menu: "Inventory",
   *     scope: "ENTITY",
   *     actions: [
   *       { id: "perm_1", actionName: "View", actionId: "act_1" },
   *       { id: "perm_2", actionName: "Create", actionId: "act_2" }
   *     ]
   *   }
   * ]
   */
  @Get('permissions/all')
  @UseGuards(AuthGuard)
  async getAllPermissions(
    @Req() req: any,
    @Query('scope') scope?: 'admin' | 'user',
  ) {
    // Validate admin
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view permissions');
    }

    return this.roleService.getAllPermissions(scope);
  }

   
}

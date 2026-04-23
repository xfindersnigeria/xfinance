
import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, ForbiddenException, Query, Req } from '@nestjs/common';
import { UserService, CreateUserDto, UpdateUserDto } from './user.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { getEffectiveGroupId } from '@/auth/utils/context.util';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * POST /users
   * Create single or bulk users
   * Can distinguish between single/bulk by presence of email vs emails
   * Requires admin role
   *
   * Single user:
   * {
   *   "email": "john@example.com",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "department": "Sales",
   *   "roleId": "role_id",
   *   "scope": "ENTITY" | "GROUP",
   *   "requirePasswordChange": true,
   *   "sendWelcomeEmail": true,
   *   "customMessage": "optional message for email"
   * }
   *
   * Bulk users:
   * {
   *   "emails": "john@example.com, jane@example.com, bob@example.com",
   *   "roleId": "role_id",
   *   "scope": "ENTITY" | "GROUP",
   *   "requirePasswordChange": true,
   *   "sendWelcomeEmail": true
   * }
   */
  @Post()
  @UseGuards(AuthGuard)
  async createUser(@Req() req: any, @Body() dto: CreateUserDto) {
    // Validate admin
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can create users');
    }
  const effectiveGroupId = getEffectiveGroupId(req)
     if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to view roles');  
    }
    return this.userService.createUser(effectiveGroupId, req.user.id, dto);
  }

    /**
   * GET /users/stats
   * Returns total users, active users, roles, and pending invites for the group
   */
  @Get('stats')
  @UseGuards(AuthGuard)
  async getUserStats(@Req() req: any) {
    // Only admins can view stats
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view user stats');
    }
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to view user stats');  
    }
    return this.userService.getUserStatsByGroup(effectiveGroupId);
  }

  /**
   * GET /users
   * Get all users in the group with optional search and pagination
   * Query Parameters:
   * - search: Filter by email, firstName, lastName, department (optional, case-insensitive)
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10, max: 100)
   * Example: GET /users?search=john&page=1&limit=10
   */
  @Get()
  @UseGuards(AuthGuard)
  async getUsers(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // Validate admin
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view users');
    }
    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to view users');  
    }
    return this.userService.getUsersByGroup(effectiveGroupId, {
      search: search?.trim(),
      page: Math.max(1, parseInt(String(page), 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10)),
    });
  }

  /**
   * GET /users/:id
   * Get single user by ID
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async getUser(@Req() req: any, @Param('id') id: string) {
    // Validate admin or own user
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    const isOwnUser = req.user.id === id;

    if (!isAdmin && !isOwnUser) {
      throw new ForbiddenException('Can only view own user or admin can view all');
    }

    const effectiveGroupId = getEffectiveGroupId(req);
     if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to view roles');  
    }

    return this.userService.getUser(id, effectiveGroupId);
  }

  /**
   * PUT /users/:id
   * Update user details
   * Admins can change role, restrict entity access, deactivate
   * Users can update own profile (firstName, lastName, department)
   */
  @Put(':id')
  @UseGuards(AuthGuard)
  async updateUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    const isOwnUser = req.user.id === id;

    // Admins can update anyone, users can update own profile
    if (!isAdmin && !isOwnUser) {
      throw new ForbiddenException('Can only update own profile');
    }

    // Non-admins cannot change these fields
    if (!isAdmin) {
      if (
        dto.roleId ||
        dto.adminEntities !== undefined ||
        dto.isActive !== undefined ||
        dto.requirePasswordChange !== undefined
      ) {
        throw new ForbiddenException('Users can only update firstName, lastName, department');
      }
    }

    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to update users');  
    }

    return this.userService.updateUser(id, effectiveGroupId, dto);
  }

  /**
   * POST /users/:id/deactivate
   * Deactivate (soft delete) a user
   * Only admins allowed
   * Decrements subscription user count
   */
  @Post(':id/deactivate')
  @UseGuards(AuthGuard)
  async deactivateUser(@Req() req: any, @Param('id') id: string) {
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can deactivate users');
    }

    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to deactivate users');  
    }

    return this.userService.deactivateUser(id, effectiveGroupId);
  }


  /** DELETE /users/:id
   * Permanently delete a user 
   * Only admins allowed
   * Decrements subscription user count
   * 
   * Note: This is a destructive action and should be used with caution. Consider using deactivate instead for most cases.
   * This endpoint is provided for cases where permanent deletion is necessary (e.g. GDPR requests) but is not intended for regular user management.
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can delete users');
    }

    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to delete users');  
    }

    return this.userService.deleteUser(id, effectiveGroupId);
  }


  /**
   * POST /users/:id/reactivate
   * Reactivate a deactivated user
   * Only admins allowed
   * Increments subscription user count (checks limit)
   */
  @Post(':id/reactivate')
  @UseGuards(AuthGuard)
  async reactivateUser(@Req() req: any, @Param('id') id: string) {
    const isAdmin = req.user.systemRole === 'superadmin' || req.user.systemRole === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can reactivate users');
    }

    const effectiveGroupId = getEffectiveGroupId(req);
    if (!effectiveGroupId) {
      throw new ForbiddenException('Group context is required to reactivate users');  
    }

    return this.userService.reactivateUser(id, effectiveGroupId);
  }
}

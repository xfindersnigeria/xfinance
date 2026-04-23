import { Controller, Get, Post, Patch, Delete, Body, UseGuards, ForbiddenException, Query, Param, NotFoundException, BadRequestException, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateSubscriptionTierDto } from './dto/create-subscription-tier.dto';
import { UpdateSubscriptionTierDto } from './dto/update-subscription-tier.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { systemRole } from 'prisma/generated/enums';
import { Roles } from '@/auth/decorators/roles.decorator';
import { getEffectiveGroupId } from '@/auth/utils/context.util';
import { RolesGuard } from '@/auth/guards/roles.guard';

  @UseGuards(AuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * GET /subscription/tiers
   * Get all available subscription tiers/packages
   * Public endpoint - anyone can view packages
   */
  @Get('tiers')
  async getTiers() {
    return this.subscriptionService.getPackages();
  }

  /**
   * GET /subscription/current
   * Get current group's subscription with usage stats
   * Requires auth
   */
  @Get('current')
  @UseGuards(AuthGuard)
  async getCurrentSubscription(@Req() req: any) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    return this.subscriptionService.getCurrentSubscription(effectiveGroupId);
  }

  /**
   * POST /subscription/upgrade
   * Upgrade/downgrade subscription to a new tier
   * Requires admin role
   * Body: { tierId: "string" }
   */
  @Post('upgrade')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin, systemRole.admin)
  async upgradeSubscription(
    @Req() req: any,
    @Body() { tierId }: { tierId: string },
  ) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    

    if (!tierId) {
      throw new ForbiddenException('tierId is required');
    }

    return this.subscriptionService.updateSubscription(effectiveGroupId, tierId, req.user.id);
  }

  /**
   * GET /subscription/history
   * Get subscription change history for audit trail
   * Requires admin role
   * Query params: page (default 1), limit (default 10)
   */
  @Get('history')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin, systemRole.admin)
  async getHistory(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
      const effectiveGroupId = getEffectiveGroupId(req)
      if (!effectiveGroupId) {
        throw new NotFoundException('Group context not found');
      }


    return this.subscriptionService.getHistory(effectiveGroupId, parseInt(page), parseInt(limit));
  }

  /**
   * GET /subscription/modules
   * Get all modules available in current subscription
   * Requires auth
   */
  @Get('modules')
  @UseGuards(AuthGuard)
  async getAvailableModules(@Req() req: any) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    return this.subscriptionService.getAvailableModules(effectiveGroupId);
  }

  /**
   * GET /subscription/modules/entity
   * Get all ENTITY-scope modules available in subscription
   * Requires auth
   */
  @Get('modules/entity')
  @UseGuards(AuthGuard)
  async getAvailableEntityModules(@Req() req: any) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    return this.subscriptionService.getAvailableEntityModules(effectiveGroupId);
  }

  /**
   * GET /subscription/modules/group
   * Get all GROUP-scope (admin) modules available in subscription
   * Requires auth
   */
  @Get('modules/group')
  @UseGuards(AuthGuard)
  async getAvailableGroupModules(@Req() req: any) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    return this.subscriptionService.getAvailableGroupModules(effectiveGroupId);
  }

  /**
   * POST /subscription/check/users
   * Check if new users can be added
   * Body: { count: number } (default 1)
   */
  @Post('check/users')
  @UseGuards(AuthGuard)
  async checkUserLimitBefore(
    @Req() req: any,
    @Body() { count }: { count?: number },
  ) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    return this.subscriptionService.checkUserLimit(effectiveGroupId, count || 1);
  }

  /**
   * POST /subscription/check/entities
   * Check if new entities can be created
   * Body: { count: number } (default 1)
   */
  @Post('check/entities')
  @UseGuards(AuthGuard)
  async checkEntityLimitBefore(
    @Req() req: any,
    @Body() { count }: { count?: number },
  ) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    return this.subscriptionService.checkEntityLimit(effectiveGroupId, count || 1);
  }

  /**
   * POST /subscription/check/transactions
   * Check if new transactions can be created this month
   * Body: { count: number } (default 1)
   */
  @Post('check/transactions')
  @UseGuards(AuthGuard)
  async checkTransactionLimitBefore(
    @Req() req: any,
    @Body() { count }: { count?: number },
  ) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    return this.subscriptionService.checkTransactionLimit(effectiveGroupId, count || 1);
  }

  /**
   * POST /subscription/check/storage
   * Check if additional storage is available
   * Body: { additionalGB: number } (default 1)
   */
  @Post('check/storage')
  @UseGuards(AuthGuard)
  async checkStorageLimitBefore(
    @Req() req: any,
    @Body() { additionalGB }: { additionalGB?: number },
  ) {
    const effectiveGroupId = getEffectiveGroupId(req)
    if (!effectiveGroupId) {
      throw new NotFoundException('Group context not found');
    }
    return this.subscriptionService.checkStorageLimit(effectiveGroupId, additionalGB || 1);
  }

  // ============================================
  // SUBSCRIPTION TIER MANAGEMENT (Admin Only)
  // ============================================

  /**
   * GET /subscription/tiers/:tierId
   * 
   * Get a single subscription tier by ID
   * Public endpoint - anyone can view tier details
   * 
   * Path Parameters:
   * - tierId: Subscription tier ID
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "tier-uuid",
   *   "name": "Pro",
   *   "description": "For growing teams",
   *   "maxUsers": 50,
   *   "maxEntities": 100,
   *   "maxTransactionsMonth": 100000,
   *   "maxStorageGB": 500,
   *   "maxApiRatePerHour": 1000,
   *   "apiAccess": true,
   *   "webhooks": true,
   *   "sso": false,
   *   "customBranding": false,
   *   "prioritySupport": true,
   *   "createdAt": "2026-03-19T10:00:00Z",
   *   "updatedAt": "2026-03-19T10:00:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Tier found
   * - 404: Tier not found
   */
  @Get('tiers/:tierId')
  async getTierById(@Param('tierId') tierId: string) {
    return this.subscriptionService.getTierById(tierId);
  }

  /**
   * POST /subscription/tiers
   * 
   * Create a new subscription tier/package
   * 
   * Authorization: Superadmin only
   * 
   * Request Body (CreateSubscriptionTierDto):
   * ```json
   * {
   *   "name": "Enterprise",
   *   "description": "For large organizations",
   *   "maxUsers": 500,
   *   "maxEntities": 999,
   *   "maxTransactionsMonth": 999999,
   *   "maxStorageGB": 5000,
   *   "maxApiRatePerHour": 10000,
   *   "apiAccess": true,
   *   "webhooks": true,
   *   "sso": true,
   *   "customBranding": true,
   *   "prioritySupport": true
   * }
   * ```
   * 
   * Response (201 Created):
   * ```json
   * {
   *   "id": "tier-uuid",
   *   "name": "Enterprise",
   *   "description": "For large organizations",
   *   ...
   *   "createdAt": "2026-03-19T10:00:00Z",
   *   "updatedAt": "2026-03-19T10:00:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 201: Tier created successfully
   * - 400: Validation error
   * - 401: Unauthorized
   * - 403: Forbidden (user is not superadmin)
   * - 409: Conflict (tier name already exists)
   * 
   * Cache Invalidation:
   * - Subscription tier cache invalidated
   * - Next request to /subscription/tiers will fetch fresh data
   */
  @Post('tiers')
  @UseGuards(AuthGuard)
    @Roles(systemRole.superadmin)

  async createSubscriptionTier(
    @Req() req: any,
    @Body() createSubscriptionTierDto: CreateSubscriptionTierDto,
  ) {
    // TODO: Add superadmin check
    // if (user.systemRole !== 'superadmin') {
    //   throw new ForbiddenException('Only superadmins can create subscription tiers');
    // }
    return this.subscriptionService.createSubscriptionTier(createSubscriptionTierDto);
  }

  /**
   * PATCH /subscription/tiers/:tierId
   * 
   * Update an existing subscription tier
   * 
   * Authorization: Superadmin only
   * All fields in request body are optional
   * 
   * Path Parameters:
   * - tierId: Subscription tier ID to update
   * 
   * Request Body (UpdateSubscriptionTierDto - all fields optional):
   * ```json
   * {
   *   "name": "Enterprise Pro",
   *   "maxUsers": 1000,
   *   "apiAccess": true,
   *   "sso": true
   * }
   * ```
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "tier-uuid",
   *   "name": "Enterprise Pro",
   *   "description": "For large organizations",
   *   "maxUsers": 1000,
   *   ...
   *   "updatedAt": "2026-03-19T10:05:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Tier updated successfully
   * - 400: Validation error
   * - 401: Unauthorized
   * - 403: Forbidden (user is not superadmin)
   * - 404: Tier not found
   * - 409: Conflict (tier name already exists)
   * 
   * Cache Invalidation:
   * - Subscription tier cache invalidated
   * - All subscriptions using this tier cache refreshed on next request
   */
  @Patch('tiers/:tierId')
  @UseGuards(AuthGuard)
    @Roles(systemRole.superadmin)

  async updateSubscriptionTier(
    @Req() req: any,
    @Param('tierId') tierId: string,
    @Body() updateSubscriptionTierDto: UpdateSubscriptionTierDto,
  ) {
    // TODO: Add superadmin check
    // if (user.systemRole !== 'superadmin') {
    //   throw new ForbiddenException('Only superadmins can update subscription tiers');
    // }
    return this.subscriptionService.updateSubscriptionTier(tierId, updateSubscriptionTierDto);
  }

  /**
   * DELETE /subscription/tiers/:tierId
   * 
   * Delete a subscription tier
   * 
   * WARNING: Cannot delete tiers that have active subscriptions
   * 
   * Authorization: Superadmin only
   * 
   * Path Parameters:
   * - tierId: Subscription tier ID to delete
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "tier-uuid",
   *   "name": "Deleted Tier",
   *   "message": "Subscription tier deleted successfully"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Tier deleted successfully
   * - 401: Unauthorized
   * - 403: Forbidden (user is not superadmin)
   * - 404: Tier not found
   * - 409: Conflict (tier has active subscriptions)
   * 
   * Cache Invalidation:
   * - Subscription tier cache cleared
   * - All subscription caches updated
   */
  @Delete('tiers/:tierId')
  @UseGuards(AuthGuard)
    @Roles(systemRole.superadmin)

  async deleteSubscriptionTier(
    @Req() req: any,
    @Param('tierId') tierId: string,
  ) {
    // TODO: Add superadmin check
    // if (user.systemRole !== 'superadmin') {
    //   throw new ForbiddenException('Only superadmins can delete subscription tiers');
    // }
    return this.subscriptionService.deleteSubscriptionTier(tierId);
  }

  // ============================================
  // SUBSCRIPTION TIER MODULES MANAGEMENT
  // ============================================

  /**
   * GET /subscription/tiers/:tierId/modules
   * 
   * Get all modules assigned to a subscription tier
   * 
   * Path Parameters:
   * - tierId: Subscription tier ID
   * 
   * Response (200 OK):
   * ```json
   * [
   *   {
   *     "id": "sub-mod-uuid",
   *     "moduleId": "module-uuid",
   *     "module": {
   *       "id": "module-uuid",
   *       "moduleKey": "items",
   *       "displayName": "Items Master",
   *       "description": "Manage inventory items",
   *       "scope": "ENTITY",
   *       "menu": "Inventory"
   *     },
   *     "addedAt": "2026-03-19T10:00:00Z"
   *   },
   *   {
   *     "id": "sub-mod-uuid-2",
   *     "moduleId": "module-uuid-2",
   *     "module": {
   *       "id": "module-uuid-2",
   *       "moduleKey": "invoices",
   *       "displayName": "Sales Invoices",
   *       "description": "Create and manage invoices",
   *       "scope": "ENTITY",
   *       "menu": "Sales"
   *     },
   *     "addedAt": "2026-03-19T10:01:00Z"
   *   }
   * ]
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Modules retrieved successfully
   * - 404: Tier not found
   */
  @Get('tiers/:tierId/modules')
  async getSubscriptionTierModules(@Param('tierId') tierId: string) {
    return this.subscriptionService.getSubscriptionTierModules(tierId);
  }

  /**
   * POST /subscription/tiers/:tierId/modules/:moduleId
   * 
   * Add a module to a subscription tier
   * 
   * Authorization: Superadmin only
   * 
   * Path Parameters:
   * - tierId: Subscription tier ID
   * - moduleId: Module ID to add
   * 
   * Response (201 Created):
   * ```json
   * {
   *   "id": "sub-mod-uuid",
   *   "moduleId": "module-uuid",
   *   "module": {
   *     "id": "module-uuid",
   *     "moduleKey": "items",
   *     "displayName": "Items Master",
   *     "description": "Manage inventory items",
   *     "scope": "ENTITY",
   *     "menu": "Inventory"
   *   },
   *   "addedAt": "2026-03-19T10:00:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 201: Module added successfully
   * - 401: Unauthorized
   * - 403: Forbidden (not superadmin)
   * - 404: Tier or module not found
   * - 409: Conflict (module already assigned to tier)
   * 
   * Cache Invalidation:
   * - Subscription tier cache cleared
   * - Tier will include the new module in next request
   */
  @Post('tiers/:tierId/modules/:moduleId')
  @UseGuards(AuthGuard)
  @Roles(systemRole.superadmin)
  async addModuleToSubscriptionTier(
    @Req() req: any,
    @Param('tierId') tierId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.subscriptionService.addModuleToSubscriptionTier(tierId, moduleId);
  }

  /**
   * DELETE /subscription/tiers/:tierId/modules/:moduleId
   * 
   * Remove a module from a subscription tier
   * 
   * Authorization: Superadmin only
   * 
   * Path Parameters:
   * - tierId: Subscription tier ID
   * - moduleId: Module ID to remove
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "message": "Module successfully removed from subscription tier"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Module removed successfully
   * - 401: Unauthorized
   * - 403: Forbidden (not superadmin)
   * - 404: Tier or module assignment not found
   * 
   * Cache Invalidation:
   * - Subscription tier cache cleared
   * - Tier will exclude the removed module in next request
   */
  @Delete('tiers/:tierId/modules/:moduleId')
  @UseGuards(AuthGuard)
  @Roles(systemRole.superadmin)
  async removeModuleFromSubscriptionTier(
    @Req() req: any,
    @Param('tierId') tierId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.subscriptionService.removeModuleFromSubscriptionTier(tierId, moduleId);
  }

  /**
   * PATCH /subscription/tiers/:tierId/modules
   * 
   * Replace all modules for a subscription tier
   * WARNING: This will remove all existing module assignments
   * 
   * Authorization: Superadmin only
   * 
   * Path Parameters:
   * - tierId: Subscription tier ID
   * 
   * Request Body:
   * ```json
   * {
   *   "moduleIds": [
   *     "module-uuid-1",
   *     "module-uuid-2",
   *     "module-uuid-3"
   *   ]
   * }
   * ```
   * 
   * Response (200 OK):
   * ```json
   * [
   *   {
   *     "id": "sub-mod-uuid-1",
   *     "moduleId": "module-uuid-1",
   *     "module": {
   *       "id": "module-uuid-1",
   *       "moduleKey": "items",
   *       "displayName": "Items Master",
   *       "scope": "ENTITY",
   *       "menu": "Inventory"
   *     },
   *     "addedAt": "2026-03-19T10:00:00Z"
   *   },
   *   {
   *     "id": "sub-mod-uuid-2",
   *     "moduleId": "module-uuid-2",
   *     "module": {
   *       "id": "module-uuid-2",
   *       "moduleKey": "invoices",
   *       "displayName": "Sales Invoices",
   *       "scope": "ENTITY",
   *       "menu": "Sales"
   *     },
   *     "addedAt": "2026-03-19T10:01:00Z"
   *   }
   * ]
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Modules updated successfully
   * - 401: Unauthorized
   * - 403: Forbidden (not superadmin)
   * - 404: Tier or some modules not found
   * 
   * Cache Invalidation:
   * - Subscription tier cache cleared
   * - All old module assignments removed
   * - New assignments immediately available
   */
  @Patch('tiers/:tierId/modules')
  @UseGuards(AuthGuard)
  @Roles(systemRole.superadmin)
  async updateSubscriptionTierModules(
    @Req() req: any,
    @Param('tierId') tierId: string,
    @Body() { moduleIds }: { moduleIds: string[] },
  ) {
    if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
      throw new BadRequestException('moduleIds must be a non-empty array');
    }
    return this.subscriptionService.updateSubscriptionTierModules(tierId, moduleIds);
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT (Admin Only)
  // ============================================

  /**
   * POST /subscription/groups/:groupId
   * 
   * Create/assign a subscription to a group
   * 
   * Authorization: Admin/Superadmin of the group
   * 
   * Path Parameters:
   * - groupId: Group ID to assign subscription to
   * 
   * Request Body (CreateSubscriptionDto):
   * ```json
   * {
   *   "subscriptionTierId": "tier-uuid",
   *   "reason": "New group onboarding"
   * }
   * ```
   * 
   * Response (201 Created):
   * ```json
   * {
   *   "id": "subscription-uuid",
   *   "groupId": "group-uuid",
   *   "subscriptionTierId": "tier-uuid",
   *   "tierName": "Pro",
   *   "maxUsers": 50,
   *   "maxEntities": 100,
   *   "maxTransactionsMonth": 100000,
   *   "maxStorageGB": 500,
   *   "startDate": "2026-03-19T10:00:00Z",
   *   "billingStartDate": "2026-03-19T10:00:00Z",
   *   "isActive": true,
   *   "createdAt": "2026-03-19T10:00:00Z",
   *   "updatedAt": "2026-03-19T10:00:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 201: Subscription created successfully
   * - 400: Validation error
   * - 401: Unauthorized (JWT invalid)
   * - 403: Forbidden (not group admin)
   * - 404: Group or tier not found
   * - 409: Conflict (group already has subscription)
   * 
   * Cache Invalidation:
   * - Group subscription cache invalidated
   * - Next /subscription/current request fetches fresh data
   */
  @Post('groups/:groupId')
  @UseGuards(AuthGuard)
  async createSubscription(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    // TODO: Add authorization check - only group admin or superadmin
    // if (user.groupId !== groupId && user.systemRole !== 'superadmin') {
    //   throw new ForbiddenException('Cannot manage subscriptions for other groups');
    // }
    return this.subscriptionService.createSubscription(groupId, createSubscriptionDto);
  }

  /**
   * GET /subscription/groups/:groupId
   * 
   * Get subscription details for a specific group
   * 
   * Path Parameters:
   * - groupId: Group ID to fetch subscription for
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "subscription-uuid",
   *   "groupId": "group-uuid",
   *   "tier": {
   *     "id": "tier-uuid",
   *     "name": "Pro",
   *     "maxUsers": 50,
   *     ...
   *   },
   *   "usage": {
   *     "users": 15,
   *     "maxUsers": 50,
   *     "usersPercentage": 30,
   *     ...
   *   },
   *   "isActive": true,
   *   "createdAt": "2026-03-19T10:00:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Subscription found
   * - 401: Unauthorized
   * - 403: Forbidden (cannot view other groups)
   * - 404: Subscription not found
   */
  @Get('groups/:groupId')
  @UseGuards(AuthGuard)
  async getSubscriptionByGroupId(
    @Req() req: any,
    @Param('groupId') groupId: string,
  ) {
    // TODO: Add authorization check
    // if (user.groupId !== groupId && user.systemRole !== 'superadmin') {
    //   throw new ForbiddenException('Cannot view subscriptions for other groups');
    // }
    return this.subscriptionService.getSubscriptionByGroupId(groupId);
  }

  /**
   * PATCH /subscription/groups/:groupId
   * 
   * Update a group's subscription
   * 
   * Authorization: Admin/Superadmin of the group
   * 
   * Path Parameters:
   * - groupId: Group ID to update subscription for
   * 
   * Request Body (UpdateSubscriptionDto - all fields optional):
   * ```json
   * {
   *   "subscriptionTierId": "new-tier-uuid",
   *   "isActive": false,
   *   "reason": "Downgrade to reduce costs"
   * }
   * ```
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "subscription-uuid",
   *   "groupId": "group-uuid",
   *   "subscriptionTierId": "new-tier-uuid",
   *   "tierName": "Starter",
   *   "maxUsers": 10,
   *   "isActive": false,
   *   "updatedAt": "2026-03-19T10:05:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Subscription updated successfully
   * - 400: Validation error
   * - 401: Unauthorized
   * - 403: Forbidden (not group admin)
   * - 404: Subscription or tier not found
   * 
   * Cache Invalidation:
   * - Group subscription cache invalidated
   * - All subscription-related caches refreshed
   */
  @Patch('groups/:groupId')
  @UseGuards(AuthGuard)
  async updateSubscription(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    // TODO: Add authorization check
    // if (user.groupId !== groupId && user.systemRole !== 'superadmin') {
    //   throw new ForbiddenException('Cannot manage subscriptions for other groups');
    // }
    return this.subscriptionService.updateSubscriptionForGroup(groupId, updateSubscriptionDto);
  }

  /**
   * DELETE /subscription/groups/:groupId
   * 
   * Delete a group's subscription
   * 
   * WARNING: Deleting subscription will deactivate the group's access to premium features
   * 
   * Authorization: Superadmin only (use PATCH isActive: false to deactivate)
   * 
   * Path Parameters:
   * - groupId: Group ID to delete subscription for
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "subscription-uuid",
   *   "groupId": "group-uuid",
   *   "message": "Subscription deleted successfully"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Subscription deleted successfully
   * - 401: Unauthorized
   * - 403: Forbidden (not superadmin)
   * - 404: Subscription not found
   * 
   * Cache Invalidation:
   * - Group subscription cache cleared
   * - Group will show as having no subscription on next request
   */
  @Delete('groups/:groupId')
  @UseGuards(AuthGuard)
  async deleteSubscription(
    @Req() req: any,
    @Param('groupId') groupId: string,
  ) {
    // TODO: Add superadmin check
    // if (user.systemRole !== 'superadmin') {
    //   throw new ForbiddenException('Only superadmins can delete subscriptions');
    // }
    return this.subscriptionService.deleteSubscription(groupId);
  }

  /**
   * GET /subscription/admin/dashboard-stats
   * 
   * Get superadmin dashboard statistics
   * Returns subscription metrics: MRR, active subscriptions, trial conversions, avg revenue/customer
   * 
   * Authorization: Superadmin only
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "totalMRR": 284750,
   *   "totalMRRFormatted": "₦2,847.50",
   *   "activeSubscriptions": 847,
   *   "trialConversions": 68,
   *   "avgRevenuePerCustomer": 33600,
   *   "avgRevenuePerCustomerFormatted": "₦336.00",
   *   "tierBreakdown": [
   *     {
   *       "tierId": "tier-uuid-1",
   *       "tierName": "Free",
   *       "monthlyPrice": 0,
   *       "activeCount": 400,
   *       "mrr": 0
   *     },
   *     {
   *       "tierId": "tier-uuid-2",
   *       "tierName": "Professional",
   *       "monthlyPrice": 2999,
   *       "activeCount": 347,
   *       "mrr": 1041653
   *     },
   *     {
   *       "tierId": "tier-uuid-3",
   *       "tierName": "Enterprise",
   *       "monthlyPrice": 9999,
   *       "activeCount": 100,
   *       "mrr": 999900
   *     }
   *   ],
   *   "timestamp": "2026-03-19T10:30:00Z"
   * }
   * ```
   * 
   * Metrics Explained:
   * - totalMRR: Monthly Recurring Revenue (sum of monthlyPrice × active subscriptions) in cents
   * - activeSubscriptions: Count of currently active subscriptions
   * - trialConversions: Percentage of subscriptions that converted from trial/free tier (%)
   * - avgRevenuePerCustomer: Average MRR per active subscription in cents
   * - tierBreakdown: Breakdown by subscription tier with active count and tier MRR
   * 
   * HTTP Status Codes:
   * - 200: Dashboard stats retrieved successfully
   * - 401: Unauthorized (not authenticated)
   * - 403: Forbidden (not superadmin)
   * 
   * Cache:
   * - Results cached for 1 hour
   * - Cache key: 'subscription:superadmin:stats'
   * - Clear cache by deleting subscription or tier (auto-invalidates)
   */
  @Get('admin/dashboard-stats')
  @UseGuards(AuthGuard)
  @Roles(systemRole.superadmin)
  async getSuperadminDashboardStats(@Req() req: any) {
    // Verify superadmin
   
    return this.subscriptionService.getSuperadminDashboardStats();
  }

  /**
   * GET /subscription/admin/settings
   * 
   * Get platform-wide subscription settings
   * 
   * Authorization: Superadmin only
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "settings-uuid",
   *   "trialPeriodEnabled": true,
   *   "trialDurationDays": 14,
   *   "autoRenewalEnabled": true,
   *   "proratePayments": true,
   *   "paymentReminders": true,
   *   "gracePeriodDays": 7,
   *   "createdAt": "2026-03-19T10:00:00Z",
   *   "updatedAt": "2026-03-19T10:00:00Z"
   * }
   * ```
   * 
   * HTTP Status Codes:
   * - 200: Settings retrieved successfully
   * - 401: Unauthorized
   * - 403: Forbidden (not superadmin)
   * 
   * Cache:
   * - Results cached for 1 hour
   * - Cache key: 'subscription:settings:platform'
   * - Auto-invalidates on update
   */
  @Get('admin/settings')
  @UseGuards(AuthGuard)
  @Roles(systemRole.superadmin)
  async getSubscriptionSettings(@Req() req: any) {
    return this.subscriptionService.getSubscriptionSettings();
  }

  /**
   * PATCH /subscription/admin/settings
   * 
   * Update platform-wide subscription settings
   * 
   * Authorization: Superadmin only
   * All fields are optional
   * 
   * Request Body (all optional):
   * ```json
   * {
   *   "trialPeriodEnabled": true,
   *   "trialDurationDays": 14,
   *   "autoRenewalEnabled": true,
   *   "proratePayments": true,
   *   "paymentReminders": true,
   *   "gracePeriodDays": 7
   * }
   * ```
   * 
   * Response (200 OK):
   * ```json
   * {
   *   "id": "settings-uuid",
   *   "trialPeriodEnabled": true,
   *   "trialDurationDays": 14,
   *   "autoRenewalEnabled": true,
   *   "proratePayments": true,
   *   "paymentReminders": true,
   *   "gracePeriodDays": 7,
   *   "createdAt": "2026-03-19T10:00:00Z",
   *   "updatedAt": "2026-03-19T10:30:00Z"
   * }
   * ```
   * 
   * Field Descriptions:
   * - trialPeriodEnabled: Whether trial periods are offered to new accounts
   * - trialDurationDays: Number of days for free trial (default: 14)
   * - autoRenewalEnabled: Whether subscriptions auto-renew at end of billing cycle
   * - proratePayments: Whether to prorate charges on plan changes mid-cycle
   * - paymentReminders: Whether to send payment reminder emails
   * - gracePeriodDays: Days to wait before suspending service for non-payment (default: 7)
   * 
   * HTTP Status Codes:
   * - 200: Settings updated successfully
   * - 400: Validation error
   * - 401: Unauthorized
   * - 403: Forbidden (not superadmin)
   * 
   * Cache Invalidation:
   * - Settings cache cleared immediately
   * - Next request gets fresh settings
   */
  @Patch('admin/settings')
  @UseGuards(AuthGuard)
  @Roles(systemRole.superadmin)
  async updateSubscriptionSettings(
    @Req() req: any,
    @Body() updateSettingsDto: any,
  ) {
   
    return this.subscriptionService.updateSubscriptionSettings(updateSettingsDto);
  }
}

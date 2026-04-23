import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { BullmqService } from '../bullmq/bullmq.service';
import { systemRole, RoleScope } from 'prisma/generated/enums';
import * as bcrypt from 'bcrypt';

export interface CreateUserDto {
  // Single or bulk (mutually exclusive)
  email?: string;
  emails?: string; // Comma-separated for bulk

  // Common fields
  firstName?: string;
  lastName?: string;
  department?: string;
  roleId: string;
  scope: 'ENTITY' | 'GROUP'; // Determines systemRole: ENTITY->user, GROUP->admin
  entityId?: string; // Only for ENTITY scope
  requirePasswordChange?: boolean;
  sendWelcomeEmail?: boolean;

  // For single user only
  customMessage?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  department?: string;
  roleId?: string;
  adminEntities?: string[]; // For admins: restrict to these entities (empty = full access)
  isActive?: boolean;
  requirePasswordChange?: boolean;
}

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private bullmqService: BullmqService,
  ) {}

  /**
   * Create single or bulk users
   * Handles both single (email + firstName) and bulk (emails comma-separated) scenarios
   * Checks subscription limit before creating
   * Queues welcome email job if requested
   */
  async createUser(groupId: string, userId: string, dto: CreateUserDto) {
    // Validate dt
    if (!dto.roleId) throw new BadRequestException('roleId is required');
    if (!dto.scope) throw new BadRequestException('scope is required');
    if (!dto.email && !dto.emails) {
      throw new BadRequestException(
        'Either email (single) or emails (bulk) is required',
      );
    }

    // Verify group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, subdomain: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    // If ENTITY scope, verify entity exists and belongs to group
    let entity: { id: string; name: string; groupId: string } | null = null;
    if (dto.scope === 'ENTITY') {
      if (!dto.entityId) {
        throw new BadRequestException('entityId is required for ENTITY scope');
      }
      entity = await this.prisma.entity.findUnique({
        where: { id: dto.entityId },
        select: { id: true, name: true, groupId: true },
      });
      if (!entity || entity.groupId !== groupId) {
        throw new BadRequestException(
          'Entity not found or does not belong to this group',
        );
      }
    }

    // Verify role exists and belongs to this group
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role || role.groupId !== groupId) {
      throw new NotFoundException(
        'Role not found or does not belong to this group',
      );
    }

    // Determine systemRole based on scope
    const systemRoleValue =
      dto.scope === 'ENTITY' ? systemRole.user : systemRole.admin;

    // Handle single user creation
    if (dto.email) {
      return this.createSingleUser(groupId, dto.email, {
        firstName: dto.firstName || 'User',
        lastName: dto.lastName || '',
        department: dto.department,
        ...(entity ? { entityId: entity.id } : {}), // Handle entityId

        roleId: dto.roleId,
        systemRole: systemRoleValue,
        requirePasswordChange: dto.requirePasswordChange ?? true,
        sendWelcomeEmail: dto.sendWelcomeEmail ?? true,
        customMessage: dto.customMessage,
        group,
        entity: entity || undefined,
      });
    }

    // Handle bulk user creation
    if (dto.emails) {
      return this.createBulkUsers(groupId, dto.emails, {
        roleId: dto.roleId,
        ...(entity ? { entityId: entity.id } : {}), // Handle entityId
        systemRole: systemRoleValue,
        requirePasswordChange: dto.requirePasswordChange ?? true,
        sendWelcomeEmail: dto.sendWelcomeEmail ?? true,
        group,
        entity: entity || undefined,
      });
    }
  }

  /**
   * Create a single user
   */
  private async createSingleUser(
    groupId: string,
    email: string,
    options: {
      firstName: string;
      lastName: string;
      department?: string;
      entity?: { id: string; name: string; groupId: string }; // Added entity to options
      roleId: string;
      systemRole: systemRole;
      requirePasswordChange: boolean;
      sendWelcomeEmail: boolean;
      customMessage?: string;
      group: { id: string; name: string; subdomain: string };
    },
  ) {
    // Check subscription limit
    const check = await this.subscriptionService.checkUserLimit(groupId, 1);
    if (!check.allowed) {
      throw new ForbiddenException(check.message);
    }

    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Generate password
    const tempPassword = this.generatePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: options.firstName,
        lastName: options.lastName,
        department: options.department,
        password: hashedPassword,
        ...(options.entity ? { entityId: options.entity.id } : {}), // Handle entityId

        groupId,
        roleId: options.roleId,
        systemRole: options.systemRole,
        requirePasswordChange: options.requirePasswordChange,
        isActive: true,
        adminEntities: [], // Empty array = full access to all entities
      },
      include: { role: true },
    });

    // Increment subscription user count
    await this.subscriptionService.incrementUserCount(groupId);

    // Queue welcome email if requested
    if (options.sendWelcomeEmail) {
      await this.bullmqService.addJob('send-user-welcome-email', {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: tempPassword,
        scope: options.systemRole === systemRole.admin ? 'GROUP' : 'ENTITY',
        groupId,
        customMessage: options.customMessage,
        groupName: options.group.name,
        groupSlug: options.group.subdomain,
        entityName: options.entity?.name,
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      systemRole: user.systemRole,
      isActive: user.isActive,
      message: `User created. Welcome email sent.`
      // message: options.sendWelcomeEmail
      //   ? `User created. Welcome email sent.`
      //   : `User created. No email sent (set sendWelcomeEmail to true to send).`,
    };
  }

  /**
   * Create multiple users from comma-separated emails
   */
  private async createBulkUsers(
    groupId: string,
    emails: string,
    options: {
      roleId: string;
      systemRole: systemRole;
      requirePasswordChange: boolean;
      sendWelcomeEmail: boolean;
      group: { id: string; name: string; subdomain: string };
      entity?: { id: string; name: string }; // Added entity to options
    },
  ) {
    // Parse emails
    const emailList = emails
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emailList.length === 0) {
      throw new BadRequestException('No valid emails provided');
    }

    // Check subscription limit for all new users
    const check = await this.subscriptionService.checkUserLimit(
      groupId,
      emailList.length,
    );
    if (!check.allowed) {
      throw new ForbiddenException(check.message);
    }

    // Check for existing emails
    const existingUsers = await this.prisma.user.findMany({
      where: { email: { in: emailList } },
    });
    if (existingUsers.length > 0) {
      const existingEmails = existingUsers.map((u) => u.email).join(', ');
      throw new BadRequestException(
        `These emails already exist: ${existingEmails}`,
      );
    }

    // Create all users
    const createdUsers = [] as any;
    for (const email of emailList) {
      const tempPassword = this.generatePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const user = await this.prisma.user.create({
        data: {
          email,
          firstName: email.split('@')[0], // Use part before @ as firstName
          lastName: 'User',

          password: hashedPassword,
          groupId,
          roleId: options.roleId,
          systemRole: options.systemRole,
          requirePasswordChange: options.requirePasswordChange,
          isActive: true,
          adminEntities: [],
          ...(options.entity ? { entityId: options.entity.id } : {}), // Handle entityId
        },
      });

      createdUsers.push({ user, password: tempPassword });

      // Queue welcome email
      if (options.sendWelcomeEmail) {
        await this.bullmqService.addJob('send-user-welcome-email', {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          password: tempPassword,
          scope: options.systemRole === systemRole.admin ? 'GROUP' : 'ENTITY',
          groupId,
          groupName: options.group.name,
          groupSlug: options.group.subdomain,
          entityName: options.entity?.name,
          loginUrl: `https://${options.group.subdomain}.fevico.com.ng/auth/login`,
        });
      }
    }

    // Increment subscription user count
    await this.subscriptionService.incrementUserCount(
      groupId,
      createdUsers.length,
    );

    return {
      count: createdUsers.length,
      users: createdUsers.map((u) => ({
        id: u.user.id,
        email: u.user.email,
        firstName: u.user.firstName,
      })),
      message: `${createdUsers.length} user${createdUsers.length > 1 ? 's' : ''} created. Welcome emails sent.`,
      // message: options.sendWelcomeEmail
      //   ? `${createdUsers.length} user${createdUsers.length > 1 ? 's' : ''} created. Welcome emails sent.`
      //   : `${createdUsers.length} user${createdUsers.length > 1 ? 's' : ''} created. No emails sent.`,
    };
  }

  /**
   * Update user details
        entityId?: string; // Added entityId to options
      },
   */
  async updateUser(userId: string, groupId: string, dto: UpdateUserDto) {
    // Verify user exists and belongs to group
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.groupId !== groupId) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.department !== undefined) updateData.department = dto.department;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.requirePasswordChange !== undefined)
      updateData.requirePasswordChange = dto.requirePasswordChange;

    // Role change
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role || role.groupId !== groupId) {
        throw new NotFoundException('Role not found');
      }
      updateData.roleId = dto.roleId;
    }

    // Admin entity restriction
    if (dto.adminEntities !== undefined) {
      // Only admins can have restricted entity access
      if (user.systemRole !== systemRole.admin) {
        throw new BadRequestException(
          'Only admins can have entity restrictions',
        );
      }
      updateData.adminEntities = dto.adminEntities;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { role: true },
    });

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      department: updated.department,
      systemRole: updated.systemRole,
      isActive: updated.isActive,
      adminEntities: updated.adminEntities,
      role: updated.role,
    };
  }

  /**
   * Mark user as inactive (soft delete)
   * This decrements the subscription user count
   */
  async deactivateUser(userId: string, groupId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.groupId !== groupId) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User is already inactive');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Decrement subscription user count
    await this.subscriptionService.decrementUserCount(groupId);

    return updated;
  }

  /**
   * Reactivate an inactive user
   * This increments the subscription user count
   */
  async reactivateUser(userId: string, groupId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.groupId !== groupId) {
      throw new NotFoundException('User not found');
    }

    if (user.isActive) {
      throw new BadRequestException('User is already active');
    }

    // Check subscription limit
    const check = await this.subscriptionService.checkUserLimit(groupId, 1);
    if (!check.allowed) {
      throw new ForbiddenException(check.message);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    // Increment subscription user count
    await this.subscriptionService.incrementUserCount(groupId);

    return updated;
  }

  /**
   * Get all users in a group with optional search and pagination
   */
  async getUsersByGroup(
    groupId: string,
    options?: { search?: string; page?: number; limit?: number },
  ) {
    const { search, page = 1, limit = 10 } = options || {};

    // Build where clause
    const where: any = { groupId };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch total count for pagination
    const total = await this.prisma.user.count({ where });

    // Fetch all entity IDs for the group (for admin entity count logic)
    const allEntityIds = await this.prisma.entity.findMany({
      where: { groupId },
      select: { id: true },
    });
    const allEntityIdList = allEntityIds.map((e) => e.id);

    // Fetch paginated users
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
        adminEntities: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Compute entityCount for each user
    const usersWithEntityCount = users.map((user) => {
      let entityCount = 1;
      if (user.systemRole === 'admin') {
        if (!user.adminEntities || user.adminEntities.length === 0) {
          entityCount = allEntityIdList.length;
        } else {
          entityCount = user.adminEntities.length;
        }
      }
      return { ...user, entityCount };
    });

    return {
      data: usersWithEntityCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single user
   */
  async getUser(userId: string, groupId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, groupId },
      include: {
        role: true,
        group: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Helper: Generate random password
   */
  private generatePassword(): string {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Get user/role/invite stats for a group
   */
  async getUserStatsByGroup(groupId: string) {
    // Total users in group
    const totalUsers = await this.prisma.user.count({ where: { groupId } });
    // Active users in group
    const activeUsers = await this.prisma.user.count({
      where: { groupId, isActive: true },
    });
    // Roles in group
    const roles = await this.prisma.role.count({ where: { groupId } });
    // Pending invites: users with lastLogin == null
    const pendingInvites = await this.prisma.user.count({
      where: { groupId, lastLogin: null },
    });
    return { totalUsers, activeUsers, roles, pendingInvites };
  }

  async deleteUser(userId: string, groupId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const result = this.prisma.user.delete({
      where: { id: userId },
    });
    // decrement users count
    await this.subscriptionService.decrementUserCount(groupId);

    return result;
  }
}

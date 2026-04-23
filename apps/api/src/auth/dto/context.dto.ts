import { ApiProperty } from '@nestjs/swagger';

export class ModuleActionDto {
  @ApiProperty()
  moduleKey: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  actions: string[];

  @ApiProperty({ description: 'Available module-level actions' })
  availableActions?: string[];
}

export class MenuGroupDto {
  @ApiProperty()
  groupName: string;

  @ApiProperty({ type: [ModuleActionDto] })
  modules: ModuleActionDto[];
}

export class ContextMenuDto {
  @ApiProperty({
    type: [MenuGroupDto],
    description: 'Admin-level menu items (Overview, Admin Settings, etc)',
  })
  adminMenus: MenuGroupDto[];

  @ApiProperty({
    type: [MenuGroupDto],
    description: 'Entity-level menu items (Income, Expense, Banking, etc)',
  })
  entityMenus: MenuGroupDto[];
}

export class UserSubscriptionDto {
  @ApiProperty()
  tierId: string;

  @ApiProperty()
  tierName: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({
    type: [String],
    description: 'List of available module keys in subscription',
  })
  modules: string[];
}

export class AuthContextDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty({ required: false })
  entityId?: string;

  @ApiProperty()
  roleId: string;

  @ApiProperty({ description: 'Role name' })
  roleName: string;

  @ApiProperty({ enum: ['ADMIN', 'USER'] })
  roleScope: 'ADMIN' | 'USER';

  @ApiProperty({
    type: [String],
    description: 'Entity IDs user has admin access to (empty = full access)',
  })
  adminEntities: string[];

  @ApiProperty({ type: ContextMenuDto })
  menus: ContextMenuDto;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    description: 'Permissions by module: { moduleKey: [actionId1, actionId2] }',
  })
  permissions: Record<string, string[]>;

  @ApiProperty({ type: UserSubscriptionDto })
  subscription: UserSubscriptionDto;

  @ApiProperty()
  expiresAt: number;
}

import { IsString, IsNotEmpty, IsArray, IsEnum, MinLength, MaxLength } from 'class-validator';
import { RoleScope } from 'prisma/generated/enums';

/**
 * Create Role DTO
 * 
 * Validation Rules:
 * 1. Name: required, 3-100 chars
 * 2. Description: optional
 * 3. Scope: ADMIN or USER
 * 4. Permission IDs: array required with at least 1 permission
 * 
 * Complex Validation (in service):
 * - At least one permission must exist
 * - If action other than 'view' is selected for a module, 'view' must also be selected
 *   Example: items:import requires items:view
 * - For USER scope: all permissions must be from USER/ENTITY modules (not GROUP/SUPERADMIN)
 * - For ADMIN scope: permissions can be from GROUP/ENTITY modules (not SUPERADMIN)
 */
export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Role name must be at least 3 characters' })
  @MaxLength(100, { message: 'Role name cannot exceed 100 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(3, { message: 'Description must be at least 3 characters' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description: string;

  @IsEnum(RoleScope, {
    message: 'Scope must be either ADMIN or USER',
  })
  @IsNotEmpty()
  scope: RoleScope; // 'ADMIN' or 'USER'

  @IsArray({ message: 'Permission IDs must be an array' })
  @IsString({ each: true, message: 'Each permission ID must be a string' })
  @IsNotEmpty({ message: 'At least one permission must be selected' })
  permissionIds: string[]; // Array of permission IDs
}

export class UpdateRoleDto {
  @IsString()
  @MinLength(3, { message: 'Role name must be at least 3 characters' })
  @MaxLength(100, { message: 'Role name cannot exceed 100 characters' })
  name?: string;

  @IsString()
  @MinLength(3, { message: 'Description must be at least 3 characters' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsArray({ message: 'Permission IDs must be an array' })
  @IsString({ each: true, message: 'Each permission ID must be a string' })
  permissionIds?: string[];
}

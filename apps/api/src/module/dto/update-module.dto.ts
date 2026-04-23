import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ModuleScope } from 'prisma/generated/enums';

/**
 * Update Module DTO
 * 
 * Payload for updating an existing module.
 * Only users with admin/superadmin privileges can update modules.
 * All fields are optional - only provide fields you want to change.
 */
export class UpdateModuleDto {
  /**
   * New display name for the module
   * 
   * Optional - leave empty to keep existing value
   */
  @IsOptional()
  @IsString()
  displayName?: string;

  /**
   * Updated description of the module's purpose
   * 
   * Optional - leave empty to keep existing value
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Update the module scope
   * 
   * Warning: Changing scope affects where module appears in the system
   * and which users can access it.
   * 
   * Optional - leave empty to keep existing value
   */
  @IsOptional()
  @IsEnum(ModuleScope)
  scope?: ModuleScope;

  /**
   * Update menu category grouping
   * 
   * Examples: "Income", "Expense", "Settings", "Accounting"
   * Optional - leave empty to keep existing value
   */
  @IsOptional()
  @IsString()
  menu?: string;

  /**
   * Update menu visibility
   * 
   * Optional - leave empty to keep existing value
   */
  @IsOptional()
  @IsBoolean()
  isMenuVisible?: boolean;
}

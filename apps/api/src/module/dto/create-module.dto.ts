import { IsString, IsOptional, IsEnum, IsBoolean, IsNotEmpty } from 'class-validator';
import { ModuleScope } from 'prisma/generated/enums';

/**
 * Create Module DTO
 * 
 * Payload for creating a new module with its associated metadata.
 * Only users with admin/superadmin privileges can create modules.
 */
export class CreateModuleDto {
  /**
   * Unique identifier for the module (e.g., "items", "invoices", "accounts")
   * Must be lowercase alphanumeric with underscores only
   * Combined with scope, forms a unique constraint
   * 
   * Examples: "items", "sales_invoices", "expense_bills"
   */
  @IsString()
  @IsNotEmpty()
  moduleKey!: string;

  /**
   * Human-readable name displayed in UI
   * Used in menu labels and permission selector
   * 
   * Examples: "Items Master", "Sales Invoices", "Billing"
   */
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  /**
   * Optional detailed description of the module's purpose
   * 
   * Example: "Manage all inventory items and stock levels"
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Module scope - determines access level
   * 
   * Allowed Values:
   * - SUPERADMIN: System-level modules (user management, settings)
   * - GROUP: Group-level modules (group settings, billing)
   * - ENTITY: Entity-level modules (invoices, items, accounts) [default]
   */
  @IsOptional()
  @IsEnum(ModuleScope)
  scope?: ModuleScope;

  /**
   * Menu category grouping
   * Used to organize modules in the sidebar menu
   * 
   * Examples: "Income", "Expense", "Settings", "Accounting"
   */
  @IsString()
  @IsNotEmpty()
  menu!: string;

  /**
   * Whether this module should appear in the main menu/sidebar
   * 
   * Default: true
   * Set to false for system or hidden modules
   */
  @IsOptional()
  @IsBoolean()
  isMenuVisible?: boolean;
}

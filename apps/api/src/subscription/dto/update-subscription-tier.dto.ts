import { IsString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

/**
 * Update Subscription Tier DTO
 * 
 * Updates an existing subscription tier/package
 * All fields are optional - only specify fields to change
 * Only superadmin users can update subscription tiers
 */
export class UpdateSubscriptionTierDto {
  /**
   * Update the tier name
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Update the description
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Update the monthly price in cents
   * Examples: 0 (free), 2999 ($29.99/month), 4999 ($49.99/month)
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPrice?: number;

  /**
   * Update the yearly price in cents
   * Examples: 0 (free), 29999 ($299.99/year for annual billing)
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  yearlyPrice?: number;

  /**
   * Update max users limit
   */
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxUsers?: number;

  /**
   * Update max entities limit
   */
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxEntities?: number;

  /**
   * Update max transactions per month
   */
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxTransactionsMonth?: number;

  /**
   * Update max storage in GB
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStorageGB?: number;

  /**
   * Update max API rate per hour
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxApiRatePerHour?: number;

  /**
   * Update API access feature
   */
  @IsOptional()
  @IsBoolean()
  apiAccess?: boolean;

  /**
   * Update webhooks feature
   */
  @IsOptional()
  @IsBoolean()
  webhooks?: boolean;

  /**
   * Update SSO feature
   */
  @IsOptional()
  @IsBoolean()
  sso?: boolean;

  /**
   * Update custom branding feature
   */
  @IsOptional()
  @IsBoolean()
  customBranding?: boolean;

  /**
   * Update priority support feature
   */
  @IsOptional()
  @IsBoolean()
  prioritySupport?: boolean;

  /**
   * Array of module IDs to assign to this tier
   * Optional - if not provided, existing modules remain unchanged
   * If provided, all existing modules are replaced with these
   * Examples: ["uuid-1", "uuid-2"] or [] to remove all modules
   */
  @IsOptional()
  @IsString({ each: true })
  moduleIds?: string[];
}

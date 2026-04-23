import { IsString, IsInt, IsBoolean, IsOptional, IsNotEmpty, Min, Max } from 'class-validator';

/**
 * Create Subscription Tier DTO
 * 
 * Creates a new subscription package/tier
 * Only superadmin users can create subscription tiers
 */
export class CreateSubscriptionTierDto {
  /**
   * Unique name for the subscription tier
   * Examples: "Free", "Pro", "Enterprise", "Custom"
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Description of the tier for UI display
   * Examples: "Perfect for small teams", "For growing enterprises"
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Monthly price in cents
   * Examples: 0 (free), 2999 ($29.99/month), 4999 ($49.99/month)
   * Optional - if not provided, no monthly billing available
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPrice?: number;

  /**
   * Yearly price in cents
   * Examples: 0 (free), 29999 ($299.99/year for annual billing)
   * Optional - if not provided, no yearly billing available
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  yearlyPrice?: number;

  /**
   * Maximum number of user accounts (optional)
   * -1 = unlimited, 0 = not allowed
   * Examples: 5, 50, 999
   */
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxUsers?: number;

  /**
   * Maximum number of entities (optional)
   * -1 = unlimited, 0 = not allowed
   * Examples: 1, 10, 100, 999
   */
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxEntities?: number;

  /**
   * Maximum transactions per month (optional)
   * -1 = unlimited, 0 = not allowed
   * Examples: 1000, 10000, 100000, 999999
   */
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxTransactionsMonth?: number;

  /**
   * Maximum storage in GB (optional)
   * Examples: 5, 50, 500
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStorageGB?: number;

  /**
   * Maximum API calls per hour (optional)
   * Examples: 100, 1000, 10000
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxApiRatePerHour?: number;

  /**
   * Enable API access for this tier (optional, default: false)
   */
  @IsOptional()
  @IsBoolean()
  apiAccess?: boolean;

  /**
   * Enable webhooks for this tier (optional, default: false)
   */
  @IsOptional()
  @IsBoolean()
  webhooks?: boolean;

  /**
   * Enable SSO (Single Sign-On) for this tier (optional, default: false)
   */
  @IsOptional()
  @IsBoolean()
  sso?: boolean;

  /**
   * Enable custom branding
   * default: false
   */
  @IsOptional()
  @IsBoolean()
  customBranding?: boolean;

  /**
   * Enable priority support
   * default: false
   */
  @IsOptional()
  @IsBoolean()
  prioritySupport?: boolean;

  /**
   * Array of module IDs to assign to this tier
   * Optional - can assign modules after tier creation
   * Examples: ["uuid-1", "uuid-2", "uuid-3"]
   */
  @IsOptional()
  @IsString({ each: true })
  moduleIds?: string[];
}

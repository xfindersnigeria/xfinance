import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Create Subscription DTO
 * 
 * Assigns a subscription tier to a group
 * Only admin/superadmin users can create subscriptions for their group
 */
export class CreateSubscriptionDto {
  /**
   * ID of the subscription tier to assign
   * Must reference an existing SubscriptionTier
   * 
   * Examples: "tier-free", "tier-pro", UUID of a tier
   */
  @IsString()
  @IsNotEmpty()
  subscriptionTierId!: string;

  /**
   * Optional reason for assigning this subscription
   * Examples: "New group onboarding", "Trial period", "Upgrade from free"
   */
  @IsString()
  reason?: string;
}

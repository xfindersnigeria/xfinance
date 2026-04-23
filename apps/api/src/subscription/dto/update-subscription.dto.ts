import { IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * Update Subscription DTO
 * 
 * Updates a group's subscription configuration
 * All fields are optional - only specify fields to change
 * Only admin/superadmin users can update their group's subscription
 */
export class UpdateSubscriptionDto {
  /**
   * Change the subscription tier
   * If provided, will update the group to the specified tier
   * Leave empty to keep current tier
   */
  @IsOptional()
  @IsString()
  subscriptionTierId?: string;

  /**
   * Update subscription active status
   * true = subscription is active
   * false = subscription is paused/inactive
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * Optional reason for the update
   * Examples: "Downgrade to reduce costs", "Pause for now", "Temporary suspension"
   */
  @IsOptional()
  @IsString()
  reason?: string;
}

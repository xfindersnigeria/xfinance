// lib/api/services/subscriptionService.ts
import { apiClient } from '../client';

/**
 * Subscription tier with features and limits
 */
export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  maxUsers: number;
  maxEntities: number;
  maxTransactionsMonth: number;
  maxStorageGB: number;
  maxApiRatePerHour: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  customBranding?: boolean;
  prioritySupport?: boolean;
  subscriptionModules: Array<{
    moduleId: string;
    module: {
      id: string;
      moduleKey: string;
      displayName: string;
      scope: string;
    };
  }>;
}

/**
 * Usage statistics for current subscription
 */
export interface UsageStats {
  users: number;
  maxUsers: number;
  usersPercentage: number;
  entities: number;
  maxEntities: number;
  entitiesPercentage: number;
  transactionsMonth: number;
  maxTransactionsMonth: number;
  transactionsPercentage: number;
  storageGB: number;
  maxStorageGB: number;
  storagePercentage: number;
}

/**
 * Current active subscription
 */
export interface CurrentSubscription {
  id: string;
  groupId: string;
  subscriptionTierId: string;
  tierName: string;
  isActive: boolean;
  billingStartDate: string;
  billingEndDate: string;
  renewalDate: string;
  endDate: string | null;
  maxUsers: number;
  usedUsers: number;
  maxEntities: number;
  usedEntities: number;
  maxTransactionsMonth: number;
  usedTransactionsMonth: number;
  maxStorageGB: number;
  usedStorageGB: number;
  maxApiRatePerHour: number;
  allowedModuleIds: string[];
  tier: any;
  usage: UsageStats;
}

/**
 * Subscription change entry
 */
export interface SubscriptionHistoryEntry {
  id: string;
  groupId: string;
  previousTierId: string;
  previousTierName: string;
  newTierId: string;
  newTierName: string;
  changeReason: string;
  changedByUserId: string;
  changedBy: {
    email: string;
    firstName: string;
    lastName: string;
  };
  effectiveDate: string;
  createdAt: string;
}

/**
 * Subscription history response with pagination
 */
export interface SubscriptionHistoryResponse {
  history: SubscriptionHistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Tier breakdown for dashboard stats
 */
export interface TierBreakdown {
  tierId: string;
  tierName: string;
  monthlyPrice: number;
  activeCount: number;
  mrr: number;
}

/**
 * Dashboard statistics response
 */
export interface DashboardStats {
  totalMRR: number;
  totalMRRFormatted: string;
  activeSubscriptions: number;
  trialConversions: number;
  avgRevenuePerCustomer: number;
  avgRevenuePerCustomerFormatted: string;
  tierBreakdown: TierBreakdown[];
  timestamp: string;
}

/**
 * Platform-wide subscription settings
 */
export interface SubscriptionSettings {
  id: string;
  trialPeriodEnabled: boolean;
  trialDurationDays: number;
  autoRenewalEnabled: boolean;
  proratePayments: boolean;
  paymentReminders: boolean;
  gracePeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for updating subscription settings
 */
export interface UpdateSubscriptionSettingsPayload {
  trialPeriodEnabled?: boolean;
  trialDurationDays?: number;
  autoRenewalEnabled?: boolean;
  proratePayments?: boolean;
  paymentReminders?: boolean;
  gracePeriodDays?: number;
}

/**
 * Get all available subscription tiers
 * Public endpoint - no auth required
 */
export const getSubscriptionTiers = (): Promise<SubscriptionTier[]> => {
  return apiClient<SubscriptionTier[]>('subscription/tiers', {
    method: 'GET',
  });
};

/**
 * Get current group's active subscription with usage stats
 * Requires authentication
 */
export const getCurrentSubscription = (): Promise<CurrentSubscription> => {
  return apiClient<CurrentSubscription>('subscription/current', {
    method: 'GET',
  });
};

/**
 * Upgrade/downgrade subscription to a new tier
 * Requires admin role
 */
export const upgradeSubscription = (tierId: string): Promise<CurrentSubscription> => {
  return apiClient<CurrentSubscription>('subscription/upgrade', {
    method: 'POST',
    body: JSON.stringify({ tierId }),
  });
};

/**
 * Get superadmin dashboard statistics
 * Returns subscription metrics: MRR, active subscriptions, trial conversions, avg revenue/customer
 * Requires superadmin role
 */
export const getDashboardStats = (): Promise<DashboardStats> => {
  return apiClient<DashboardStats>('subscription/admin/dashboard-stats', {
    method: 'GET',
  });
};

/**
 * Get subscription change audit trail
 * Requires admin role
 */
export const getSubscriptionHistory = (
  page: number = 1,
  limit: number = 10
): Promise<SubscriptionHistoryResponse> => {
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  }).toString();

  return apiClient<SubscriptionHistoryResponse>(`subscription/history?${queryParams}`, {
    method: 'GET',
  });
};

/**
 * Check if new users can be added before creating
 * Requires authentication
 */
export const checkUserLimit = (count: number): Promise<{
  allowed: boolean;
  message?: string;
}> => {
  return apiClient<{ allowed: boolean; message?: string }>('subscription/check/users', {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
};

/**
 * Check if new entities can be created
 * Requires authentication
 */
export const checkEntityLimit = (count: number = 1): Promise<{
  allowed: boolean;
  message?: string;
}> => {
  return apiClient<{ allowed: boolean; message?: string }>('subscription/check/entities', {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
};

/**
 * Check if monthly transaction limit is reached
 * Requires authentication
 */
export const checkTransactionLimit = (count: number = 1): Promise<{
  allowed: boolean;
  message?: string;
}> => {
  return apiClient<{ allowed: boolean; message?: string }>('subscription/check/transactions', {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
};

/**
 * Check if storage limit is reached
 * Requires authentication
 */
export const checkStorageLimit = (sizeGB: number): Promise<{
  allowed: boolean;
  message?: string;
}> => {
  return apiClient<{ allowed: boolean; message?: string }>('subscription/check/storage', {
    method: 'POST',
    body: JSON.stringify({ sizeGB }),
  });
};

// ============================================
// SUBSCRIPTION TIER MANAGEMENT (Admin Only)
// ============================================

/**
 * Tier features and limits
 */
export interface SubscriptionTierDetail {
  id: string;
  name: string;
  description?: string;
  maxUsers: number;
  maxEntities: number;
//   maxTransactionsMonth: number;
//   maxStorageGB: number;
//   maxApiRatePerHour: number;
//   apiAccess: boolean;
//   webhooks: boolean;
//   sso: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a subscription tier
 */
export interface CreateSubscriptionTierPayload {
  name: string;
  description?: string;
  maxUsers: number;
  maxEntities: number;
//   maxTransactionsMonth: number;
//   maxStorageGB: number;
//   maxApiRatePerHour: number;
//   apiAccess?: boolean;
//   webhooks?: boolean;
//   sso?: boolean;
  customBranding?: boolean;
  prioritySupport?: boolean;
}

/**
 * Payload for updating a subscription tier
 */
export interface UpdateSubscriptionTierPayload {
  name?: string;
  description?: string;
  maxUsers?: number;
  maxEntities?: number;
//   maxTransactionsMonth?: number;
//   maxStorageGB?: number;
//   maxApiRatePerHour?: number;
//   apiAccess?: boolean;
//   webhooks?: boolean;
//   sso?: boolean;
  customBranding?: boolean;
  prioritySupport?: boolean;
}

/**
 * Get a single subscription tier by ID
 * Requires authentication
 */
export const getSubscriptionTierById = (tierId: string): Promise<SubscriptionTierDetail> => {
  return apiClient<SubscriptionTierDetail>(`subscription/tiers/${tierId}`, {
    method: 'GET',
  });
};

/**
 * Create a new subscription tier
 * Requires superadmin role
 * Cache invalidated on success
 */
export const createSubscriptionTier = (
  payload: CreateSubscriptionTierPayload
): Promise<SubscriptionTierDetail> => {
  return apiClient<SubscriptionTierDetail>('subscription/tiers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Update an existing subscription tier
 * Requires superadmin role
 * All fields optional
 * Cache invalidated on success
 */
export const updateSubscriptionTier = (
  tierId: string,
  payload: UpdateSubscriptionTierPayload
): Promise<SubscriptionTierDetail> => {
  return apiClient<SubscriptionTierDetail>(`subscription/tiers/${tierId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

/**
 * Delete a subscription tier
 * Requires superadmin role
 * Cannot delete if it has active subscriptions
 * Cache invalidated on success
 */
export const deleteSubscriptionTier = (
  tierId: string
): Promise<{ id: string; name: string; message: string }> => {
  return apiClient<{ id: string; name: string; message: string }>(
    `subscription/tiers/${tierId}`,
    {
      method: 'DELETE',
    }
  );
};

// ============================================
// GROUP SUBSCRIPTION MANAGEMENT (Admin/Superadmin)
// ============================================

/**
 * Group subscription with tier details
 */
export interface GroupSubscription {
  id: string;
  groupId: string;
  subscriptionTierId: string;
  tier?: SubscriptionTierDetail;
  tierName: string;
  maxUsers: number;
  maxEntities: number;
//   maxTransactionsMonth: number;
//   maxStorageGB: number;
//   maxApiRatePerHour: number;
  startDate: string;
  billingStartDate: string;
  billingEndDate?: string;
  renewalDate?: string;
  isActive: boolean;
  usedUsers: number;
  usedEntities: number;
//   usedTransactionsMonth: number;
//   usedStorageGB: number;
  history?: Array<{
    id: string;
    previousTierName: string;
    newTierName: string;
    changeReason: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a group subscription
 */
export interface CreateGroupSubscriptionPayload {
  subscriptionTierId: string;
  reason?: string;
}

/**
 * Payload for updating a group subscription
 */
export interface UpdateGroupSubscriptionPayload {
  subscriptionTierId?: string;
  isActive?: boolean;
  reason?: string;
}

/**
 * Get subscription for a specific group
 * Requires group admin or superadmin
 */
export const getGroupSubscription = (groupId: string): Promise<GroupSubscription> => {
  return apiClient<GroupSubscription>(`subscription/groups/${groupId}`, {
    method: 'GET',
  });
};

/**
 * Create/assign subscription to a group
 * Requires group admin or superadmin
 * Group can have only one subscription
 * Cache invalidated on success
 */
export const createGroupSubscription = (
  groupId: string,
  payload: CreateGroupSubscriptionPayload
): Promise<GroupSubscription> => {
  return apiClient<GroupSubscription>(`subscription/groups/${groupId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Update a group's subscription
 * Requires group admin or superadmin
 * All fields optional
 * Cache invalidated on success
 */
export const updateGroupSubscription = (
  groupId: string,
  payload: UpdateGroupSubscriptionPayload
): Promise<GroupSubscription> => {
  return apiClient<GroupSubscription>(`subscription/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

/**
 * Delete a group's subscription
 * Requires superadmin role
 * WARNING: Deactivates premium features
 * Cache invalidated on success
 */
export const deleteGroupSubscription = (
  groupId: string
): Promise<{ id: string; groupId: string; message: string }> => {
  return apiClient<{ id: string; groupId: string; message: string }>(
    `subscription/groups/${groupId}`,
    {
      method: 'DELETE',
    }
  );
};

// ============================================
// SUBSCRIPTION SETTINGS (Superadmin Only)
// ============================================

/**
 * Get platform-wide subscription settings
 * Requires superadmin role
 * Cache: 1 hour
 */
export const getSubscriptionSettings = (): Promise<SubscriptionSettings> => {
  return apiClient<SubscriptionSettings>('subscription/admin/settings', {
    method: 'GET',
  });
};

/**
 * Update platform-wide subscription settings
 * Requires superadmin role
 * All fields optional
 * Cache invalidated on success
 */
export const updateSubscriptionSettings = (
  payload: UpdateSubscriptionSettingsPayload
): Promise<SubscriptionSettings> => {
  return apiClient<SubscriptionSettings>('subscription/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

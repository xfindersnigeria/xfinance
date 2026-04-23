// lib/api/hooks/useSubscription.ts

import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getSubscriptionTiers,
  getCurrentSubscription,
  upgradeSubscription,
  getSubscriptionHistory,
  checkUserLimit,
  checkEntityLimit,
  checkTransactionLimit,
  checkStorageLimit,
  getSubscriptionTierById,
  createSubscriptionTier,
  updateSubscriptionTier,
  deleteSubscriptionTier,
  getGroupSubscription,
  createGroupSubscription,
  updateGroupSubscription,
  deleteGroupSubscription,
  getDashboardStats,
  getSubscriptionSettings,
  updateSubscriptionSettings,
  SubscriptionTier,
  SubscriptionTierDetail,
  CurrentSubscription,
  SubscriptionHistoryResponse,
  DashboardStats,
  CreateSubscriptionTierPayload,
  UpdateSubscriptionTierPayload,
  GroupSubscription,
  CreateGroupSubscriptionPayload,
  UpdateGroupSubscriptionPayload,
  SubscriptionSettings,
  UpdateSubscriptionSettingsPayload,
} from '../services/subscriptionService';
import { toast } from 'sonner';
import { useModal } from '@/components/providers/ModalProvider';

/**
 * Hook to fetch all available subscription tiers
 * Public data - can be called anytime
 */
export const useSubscriptionTiers = (
  options?: Omit<UseQueryOptions<SubscriptionTier[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['subscription', 'tiers'],
    queryFn: getSubscriptionTiers,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    ...options,
  });
};

/**
 * Hook to fetch current group's active subscription
 * Requires authentication
 */
export const useCurrentSubscription = (
  options?: Omit<UseQueryOptions<CurrentSubscription>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: getCurrentSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to upgrade/downgrade subscription to a new tier
 * Triggers whoami refresh on success
 * Requires admin role
 */
export const useUpgradeSubscription = (
  options?: UseMutationOptions<CurrentSubscription, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upgradeSubscription,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['whoami'] });
      toast.success('Subscription updated successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update subscription'
      );
    },
    ...options,
  });
};

/**
 * Hook to fetch subscription change audit trail
 * Requires admin role
 */
export const useSubscriptionHistory = (
  page: number = 1,
  limit: number = 10,
  options?: Omit<UseQueryOptions<SubscriptionHistoryResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['subscription', 'history', page, limit],
    queryFn: () => getSubscriptionHistory(page, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch superadmin dashboard statistics
 * Returns subscription metrics: MRR, active subscriptions, trial conversions, avg revenue/customer
 * Requires superadmin role
 */
export const useDashboardStats = (
  options?: Omit<UseQueryOptions<DashboardStats>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['subscription', 'dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to check if new users can be added
 * Returns { allowed: true } or { allowed: false, message: "reason" }
 */
export const useCheckUserLimit = (
  options?: UseMutationOptions<{ allowed: boolean; message?: string }, Error, number>
) => {
  return useMutation({
    mutationFn: checkUserLimit,
    ...options,
  });
};

/**
 * Hook to check if new entities can be created
 */
export const useCheckEntityLimit = (
  options?: UseMutationOptions<{ allowed: boolean; message?: string }, Error, number>
) => {
  return useMutation({
    mutationFn: checkEntityLimit,
    ...options,
  });
};

/**
 * Hook to check if monthly transaction limit is reached
 */
export const useCheckTransactionLimit = (
  options?: UseMutationOptions<{ allowed: boolean; message?: string }, Error, number>
) => {
  return useMutation({
    mutationFn: checkTransactionLimit,
    ...options,
  });
};

/**
 * Hook to check if storage limit is reached
 */
export const useCheckStorageLimit = (
  options?: UseMutationOptions<{ allowed: boolean; message?: string }, Error, number>
) => {
  return useMutation({
    mutationFn: checkStorageLimit,
    ...options,
  });
};

// ============================================
// SUBSCRIPTION TIER MANAGEMENT (Superadmin)
// ============================================

/**
 * Hook to fetch a single subscription tier by ID
 * Requires authentication
 */
export const useSubscriptionTierById = (
  tierId: string | null,
  options?: Omit<UseQueryOptions<SubscriptionTierDetail>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['subscription', 'tier', tierId],
    queryFn: () => getSubscriptionTierById(tierId!),
    enabled: !!tierId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    ...options,
  });
};

/**
 * Hook to create a new subscription tier
 * Requires superadmin role
 * Cache invalidated on success
 */
export const useCreateSubscriptionTier = (
  options?: UseMutationOptions<SubscriptionTierDetail, Error, CreateSubscriptionTierPayload>
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: createSubscriptionTier,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'tiers'] });
      toast.success(`Tier "${data.name}" created successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create tier'
      );
    },
    ...options,
  });
};

/**
 * Hook to update an existing subscription tier
 * Requires superadmin role
 * Cache invalidated on success
 */
export const useUpdateSubscriptionTier = (
  options?: UseMutationOptions<
    SubscriptionTierDetail,
    Error,
    { tierId: string; payload: UpdateSubscriptionTierPayload }
  >
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ tierId, payload }) => updateSubscriptionTier(tierId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'tiers'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'tier', data.id] });
      toast.success(`Tier "${data.name}" updated successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update tier'
      );
    },
    ...options,
  });
};

/**
 * Hook to delete a subscription tier
 * Requires superadmin role
 * Cannot delete if has active subscriptions
 * Cache invalidated on success
 */
export const useDeleteSubscriptionTier = (
  options?: UseMutationOptions<{ id: string; name: string; message: string }, Error, string>
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: deleteSubscriptionTier,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'tiers'] });
      toast.success(`Tier "${data.name}" deleted successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete tier'
      );
    },
    ...options,
  });
};

// ============================================
// GROUP SUBSCRIPTION MANAGEMENT (Admin/Superadmin)
// ============================================

/**
 * Hook to fetch subscription for a specific group
 * Requires group admin or superadmin
 */
export const useGroupSubscription = (
  groupId: string | null,
  options?: Omit<UseQueryOptions<GroupSubscription>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['subscription', 'group', groupId],
    queryFn: () => getGroupSubscription(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to create/assign subscription to a group
 * Requires group admin or superadmin
 * Group can have only one subscription
 * Cache invalidated on success
 */
export const useCreateGroupSubscription = (
  options?: UseMutationOptions<
    GroupSubscription,
    Error,
    { groupId: string; payload: CreateGroupSubscriptionPayload }
  >
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ groupId, payload }) => createGroupSubscription(groupId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'group', data.groupId] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      toast.success('Subscription assigned successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to assign subscription'
      );
    },
    ...options,
  });
};

/**
 * Hook to update a group's subscription
 * Requires group admin or superadmin
 * Can change tier or toggle active status
 * Cache invalidated on success
 */
export const useUpdateGroupSubscription = (
  options?: UseMutationOptions<
    GroupSubscription,
    Error,
    { groupId: string; payload: UpdateGroupSubscriptionPayload }
  >
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ groupId, payload }) => updateGroupSubscription(groupId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'group', data.groupId] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      // Refresh whoami since subscription affects available modules
      queryClient.invalidateQueries({ queryKey: ['whoami'] });
      toast.success('Subscription updated successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update subscription'
      );
    },
    ...options,
  });
};

/**
 * Hook to delete a group's subscription
 * Requires superadmin role
 * WARNING: Deactivates premium features
 * Cache invalidated on success
 */
export const useDeleteGroupSubscription = (
  options?: UseMutationOptions<
    { id: string; groupId: string; message: string },
    Error,
    string
  >
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: (groupId) => deleteGroupSubscription(groupId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'group', data.groupId] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['whoami'] });
      toast.success('Subscription deleted successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete subscription'
      );
    },
    ...options,
  });
};

// ============================================
// SUBSCRIPTION SETTINGS (Superadmin Only)
// ============================================

/**
 * Hook to fetch platform-wide subscription settings
 * Requires superadmin role
 * Cache: 1 hour
 */
export const useSubscriptionSettings = (
  options?: Omit<UseQueryOptions<SubscriptionSettings>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['subscription', 'settings'],
    queryFn: getSubscriptionSettings,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    ...options,
  });
};

/**
 * Hook to update platform-wide subscription settings
 * Requires superadmin role
 * Cache invalidated on success
 */
export const useUpdateSubscriptionSettings = (
  options?: UseMutationOptions<SubscriptionSettings, Error, UpdateSubscriptionSettingsPayload>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSubscriptionSettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'settings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update settings'
      );
    },
    ...options,
  });
};

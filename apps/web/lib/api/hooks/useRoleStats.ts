// lib/api/hooks/useRoleStats.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getRoleStats, RoleStats } from '../services/roleStatsService';

export const useRoleStats = (options?: Omit<UseQueryOptions<RoleStats>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['roles', 'stats'],
    queryFn: getRoleStats,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
};

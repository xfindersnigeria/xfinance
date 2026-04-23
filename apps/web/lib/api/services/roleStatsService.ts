// lib/api/services/roleStatsService.ts
import { apiClient } from '../client';

export interface RoleStats {
  systemRoles: number;
  customRoles: number;
  totalRoles: number;
}

export const getRoleStats = (): Promise<RoleStats> => {
  return apiClient<RoleStats>('roles/stats', {
    method: 'GET',
  });
};

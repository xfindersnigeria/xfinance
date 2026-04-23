// lib/api/services/groupService.ts
import { apiClient } from '../client';
import { Group } from '@/lib/types';

/**
 * API payload for creating a group.
 * Maps frontend form fields to backend API fields.
 */
export interface CreateGroupApiPayload {
  name: string; // from form: groupName
  legalName: string;
  taxId: string;
  industry: string;
  address: string; // from form: address
  city: string;
  province: string; // from form: state
  postalCode: string; // from form: zipCode
  country: string;
  email: string;
  phone: string;
  website?: string;
  subscriptionId?: string; // from form: subscriptionPlan
  logo?: { publicId: string; secureUrl: string } |  null; // optional file upload
}

/**
 * Form data from GroupForm component.
 * Uses different naming conventions than API.
 */
export interface GroupFormData {
  logo?: File | { publicId: string; secureUrl: string } | null;
  groupName: string;
  legalName: string;
  taxId: string;
  industry: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  website?: string;
  subscriptionPlan?: string;
  billingCycle?: string;
}

/**
 * Transform GroupForm data to API payload format.
 * Handles logo file separately for multipart/form-data.
 */
export const transformGroupFormToApiPayload = (
  formData: GroupFormData
): CreateGroupApiPayload => {
  return {
    name: formData.groupName,
    legalName: formData.legalName,
    taxId: formData.taxId,
    industry: formData.industry,
    address: formData.address,
    city: formData.city,
    province: formData.province,
    postalCode: formData.postalCode,
    country: formData.country,
    email: formData.email,
    phone: formData.phone,
    website: formData.website || undefined,
    subscriptionId: formData.subscriptionPlan || undefined,
    logo: (formData.logo instanceof File) ? undefined : (formData.logo || undefined),
  };
};

type CreateGroupPayload = Omit<Group, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateGroupPayload = Partial<CreateGroupPayload> & { id: string };

/**
 * Create a new group from form data.
 * Automatically transforms form field names to API format.
 * Handles logo file upload via multipart/form-data.
 * @param formData - Data from GroupForm component
 * @returns Promise resolving to created Group
 */
export const createGroup = (formData: GroupFormData): Promise<Group> => {
  const apiPayload = transformGroupFormToApiPayload(formData);
  
  // Use FormData for multipart/form-data when logo is present
  if (apiPayload.logo) {
    const formDataPayload = new FormData();
    formDataPayload.append('name', apiPayload.name);
    formDataPayload.append('legalName', apiPayload.legalName);
    formDataPayload.append('taxId', apiPayload.taxId);
    formDataPayload.append('industry', apiPayload.industry);
    formDataPayload.append('address', apiPayload.address);
    formDataPayload.append('city', apiPayload.city);
    formDataPayload.append('province', apiPayload.province);
    formDataPayload.append('postalCode', apiPayload.postalCode);
    formDataPayload.append('country', apiPayload.country);
    formDataPayload.append('email', apiPayload.email);
    formDataPayload.append('phone', apiPayload.phone);
    if (apiPayload.website) formDataPayload.append('website', apiPayload.website);
    if (apiPayload.subscriptionId) formDataPayload.append('subscriptionId', apiPayload.subscriptionId);
    if (apiPayload.logo) {
      const logoData = apiPayload.logo as any;
      if (logoData.publicId && logoData.secureUrl) {
        formDataPayload.append('logo', JSON.stringify(logoData));
      }
    }

    return apiClient<Group>('groups', {
      method: 'POST',
      body: formDataPayload,
    });
  }

  // Use JSON if no logo
  return apiClient<Group>('groups', {
    method: 'POST',
    body: JSON.stringify(apiPayload),
  });
};

/**
 * Update an existing group.
 * @param id - Group ID
 * @param payload - Partial group data to update
 * @returns Promise resolving to updated Group
 */
export const updateGroup = ({ id, ...payload }: UpdateGroupPayload): Promise<Group> => {
  return apiClient<Group>(`groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

/**
 * Delete a group and all associated entities.
 * This is a destructive operation.
 * @param id - Group ID
 * @returns Promise resolving when deletion completes
 */
export const deleteGroup = (id: string): Promise<void> => {
  return apiClient<void>(`groups/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Retrieve all groups (SUPERADMIN only).
 * Supports search, filtering, and pagination.
 * @param search - Search term for group name/industry
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @param status - Filter by group status
 * @returns Promise resolving to groups list with pagination metadata
 */
export const getGroups = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ groups: Group[]; totalCount: number }> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status && params.status !== 'All Statuses') queryParams.append('status', params.status);

  const url = `groups${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient<{ groups: Group[]; totalCount: number }>(url, {
    method: 'GET',
  });
};

/**
 * Retrieve a specific group by ID.
 * @param id - Group ID
 * @returns Promise resolving to Group object
 */
export const getGroup = (id: string): Promise<Group> => {
  return apiClient<Group>(`groups/${id}`, {
    method: 'GET',
  });
};

/**
 * Platform-wide group statistics (SUPERADMIN only)
 */
export interface GroupStats {
  totalGroups: number;
  activeGroups: number;
  trialGroups: number;
  suspendedGroups: number;
  timestamp: string;
}

/**
 * Get platform-wide group statistics.
 * Requires superadmin role
 * Cache: 5 minutes
 */
export const getGroupStats = (): Promise<GroupStats> => {
  return apiClient<GroupStats>('groups/stats/platform', {
    method: 'GET',
  });
};

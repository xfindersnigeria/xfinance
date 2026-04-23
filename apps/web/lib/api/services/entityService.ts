// lib/api/services/entityService.ts
import { apiClient } from '../client';
import { Entity } from '@/lib/types';

/**
 * Form data from EntityForm component.
 * Uses different naming conventions than API.
 */
export interface EntityFormData {
  logo?: File | { publicId: string; secureUrl: string } | null;
  name: string;
  legalName: string;
  taxId: string;
  country: string;
  currency: string; // ISO 4217 code (USD, EUR, GBP, etc.)
  yearEnd: string; // MM-DD format (e.g., "12-31")
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  website?: string;
}

/**
 * API payload for creating an entity.
 * Entity is automatically assigned to the authenticated user's group.
 */
export interface CreateEntityApiPayload {
  name?: string;
  legalName?: string;
  taxId?: string;
  country?: string;
  currency?: string; // ISO 4217 code (USD, EUR, GBP, etc.)
  yearEnd?: string; // MM-DD format (e.g., "12-31")
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phoneNumber?: string;
  email: string; // Required
  website?: string;
  logo?: { publicId: string; secureUrl: string } | null; // optional file upload
  // groupId is derived from authenticated user's context
}

/**
 * Transform EntityForm data to API payload format.
 * Handles logo file separately for multipart/form-data.
 */
export const transformEntityFormToApiPayload = (
  formData: EntityFormData
): CreateEntityApiPayload => {
  return {
    name: formData.name,
    legalName: formData.legalName,
    taxId: formData.taxId,
    country: formData.country,
    currency: formData.currency,
    yearEnd: formData.yearEnd,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    postalCode: formData.postalCode,
    phoneNumber: formData.phoneNumber,
    email: formData.email,
    website: formData.website || undefined,
    logo: (formData.logo instanceof File) ? undefined : (formData.logo || undefined),
  };
};

type CreateEntityPayload = Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateEntityPayload = Partial<CreateEntityPayload> & { id: string };

/**
 * Create a new entity (business unit) within user's group.
 * The entity is automatically assigned to the authenticated user's group.
 * Background job 'create-entity-user' is queued to create entity admin.
 * Handles logo file upload via multipart/form-data.
 * @param formData - Entity data from EntityForm component
 * @returns Promise resolving to created Entity
 */
export const createEntity = (formData: EntityFormData): Promise<Entity> => {
  const apiPayload = transformEntityFormToApiPayload(formData);
  
  // Use FormData for multipart/form-data when logo is present
  if (formData.logo instanceof File) {
    const formDataPayload = new FormData();
    formDataPayload.append('name', apiPayload.name || '');
    formDataPayload.append('legalName', apiPayload.legalName || '');
    formDataPayload.append('taxId', apiPayload.taxId || '');
    formDataPayload.append('country', apiPayload.country || '');
    formDataPayload.append('currency', apiPayload.currency || '');
    formDataPayload.append('yearEnd', apiPayload.yearEnd || '');
    formDataPayload.append('address', apiPayload.address || '');
    formDataPayload.append('city', apiPayload.city || '');
    formDataPayload.append('state', apiPayload.state || '');
    formDataPayload.append('postalCode', apiPayload.postalCode || '');
    formDataPayload.append('phoneNumber', apiPayload.phoneNumber || '');
    formDataPayload.append('email', apiPayload.email);
    if (apiPayload.website) formDataPayload.append('website', apiPayload.website);
    formDataPayload.append('logo', formData.logo);

    return apiClient<Entity>('entities', {
      method: 'POST',
      body: formDataPayload,
    });
  } else {
    return apiClient<Entity>('entities', {
      method: 'POST',
      body: JSON.stringify(apiPayload),
    });
  }
};

/**
 * Update an existing entity.
 * Entity email and taxId cannot be modified after creation (immutable).
 * Handles logo file upload via multipart/form-data.
 * @param formData - Partial entity data to update (should include id)
 * @returns Promise resolving to updated Entity
 */
export const updateEntity = (formData: EntityFormData & { id: string }): Promise<Entity> => {
  const { id, ...data } = formData;
  const apiPayload = transformEntityFormToApiPayload(data as EntityFormData);

  // Use FormData for multipart/form-data when logo is present
  if (formData.logo instanceof File) {
    const formDataPayload = new FormData();
    formDataPayload.append('name', apiPayload.name || '');
    formDataPayload.append('legalName', apiPayload.legalName || '');
    formDataPayload.append('taxId', apiPayload.taxId || '');
    formDataPayload.append('country', apiPayload.country || '');
    formDataPayload.append('currency', apiPayload.currency || '');
    formDataPayload.append('yearEnd', apiPayload.yearEnd || '');
    formDataPayload.append('address', apiPayload.address || '');
    formDataPayload.append('city', apiPayload.city || '');
    formDataPayload.append('state', apiPayload.state || '');
    formDataPayload.append('postalCode', apiPayload.postalCode || '');
    formDataPayload.append('phoneNumber', apiPayload.phoneNumber || '');
    formDataPayload.append('email', apiPayload.email);
    if (apiPayload.website) formDataPayload.append('website', apiPayload.website);
    formDataPayload.append('logo', formData.logo);

    return apiClient<Entity>(`entities/${id}`, {
      method: 'PATCH',
      body: formDataPayload,
    });
  } else {
    return apiClient<Entity>(`entities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(apiPayload),
    });
  }
};

/**
 * Delete an entity and all associated data.
 * This is a destructive operation with no recovery.
 * Cascades to delete all accounts, transactions, employees, etc.
 * @param id - Entity ID
 * @returns Promise resolving when deletion completes
 */
export const deleteEntity = (id: string): Promise<void> => {
  return apiClient<void>(`entities/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Retrieve all entities within the authenticated user's group.
 * Supports search, filtering, and pagination.
 * @param search - Search term for entity name
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Promise resolving to entities list with pagination metadata
 */
export const getEntities = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ entities: Entity[]; totalCount: number }> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = `entities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient<{ entities: Entity[]; totalCount: number }>(url, {
    method: 'GET',
  });
};

/**
 * Retrieve a specific entity by ID.
 * User must have access to the entity's group.
 * @param id - Entity ID
 * @returns Promise resolving to Entity object
 */
export const getEntity = (id: string): Promise<Entity> => {
  return apiClient<Entity>(`entities/${id}`, {
    method: 'GET',
  });
};

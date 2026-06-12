// lib/api/services/authService.ts
import { apiClient } from "../client";
import { UserPayload, WhoamiResponse } from "@/lib/types";
import { LoginCredentials } from "@/lib/schema";

export const loginUser = (
  credentials: LoginCredentials,
): Promise<UserPayload> => {
  return apiClient<UserPayload>("auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
};

/**
 * Get complete user context with menu, permissions, entities, and subscription
 * Called after login and on app startup
 */
export const getWhoami = (): Promise<WhoamiResponse> => {
  return apiClient<WhoamiResponse>("auth/whoami", {
    method: "GET",
  });
};

export const getProfile = (): Promise<UserPayload> => {
  return apiClient<UserPayload>("auth/profile", {
    method: "GET",
  });
};

export const updateProfile = (data: {
  firstName?: string;
  lastName?: string;
  department?: string;
}): Promise<UserPayload> => {
  return apiClient<UserPayload>("auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const changePassword = (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  return apiClient<{ message: string }>("auth/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const impersonateGroup = (payload: {
  groupId: string;
  groupName: string;
}): Promise<{ success: boolean; message: string; groupId: string; groupName: string }> => {
  return apiClient<{ success: boolean; message: string; groupId: string; groupName: string }>("auth/impersonate/group", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const stopGroupImpersonation = (): Promise<{ success: boolean; message: string }> => {
  return apiClient<{ success: boolean; message: string }>("auth/impersonate/group", {
    method: "DELETE",
  });
};

// --- Entity Impersonation Endpoints ---
export const impersonateEntity = (payload: {
  entityId: string;
  entityName: string;
}): Promise<{ success: boolean; message: string; entityId: string; entityName: string }> => {
  return apiClient<{ success: boolean; message: string; entityId: string; entityName: string }>("auth/impersonate/entity", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const stopEntityImpersonation = (): Promise<{ success: boolean; message: string }> => {
  return apiClient<{ success: boolean; message: string }>("auth/impersonate/entity", {
    method: "DELETE",
  });
};

export const forgotPassword = (data: { email: string }): Promise<{ message: string }> => {
  return apiClient<{ message: string }>("auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const resetPassword = (data: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  return apiClient<{ message: string }>("auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Logout endpoint
export const logout = (): Promise<void> => {
  return apiClient<void>("auth/logout", {
    method: "POST",
  });
};

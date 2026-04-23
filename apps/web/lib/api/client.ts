// lib/api/client.ts

import { getClientImpersonationHeaders } from "@/lib/utils/impersonation";

// Define the standardized success and error response structures
interface ApiResponse<T> {
  statusCode: number;
  success: true;
  data: T;
}

// Updated error response structure to match the backend
interface ApiErrorResponse {
  statusCode: number;
  success: false;
  timestamp: string;
  path: string;
  error: {
    name: string;
    message: string | string[]; // Error message can be a single string or an array
  };
}



/**
 * Get impersonation headers from storage if they exist
 * These headers are used to impersonate a group or entity
 */
const getImpersonationHeaders = (): Record<string, string> => {
  return getClientImpersonationHeaders();
};

/**
 * A generic API client for making requests to the backend.
 * It handles standardized success and error responses.
 * Automatically includes impersonation headers if active.
 *
 * @param endpoint The API endpoint to call (e.g., 'auth/login').
 * @param options The standard `fetch` options (method, body, etc.).
 * @returns The data from the successful API response.
 * @throws An error with the message from the API if the request fails.
 */
export const apiClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  // Clean the endpoint to prevent double slashes
  const cleanedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  // const url = `${API_BASE_URL}/api/v1/${cleanedEndpoint}`;
  const url = `/backend/${cleanedEndpoint}`; // Use the rewrites defined in next.config.ts

  // Check if body is FormData (for file uploads)
  const isFormData = options.body instanceof FormData;

  // Get impersonation headers
  const impersonationHeaders = getImpersonationHeaders();

  const defaultOptions: RequestInit = {
    headers: {
      // Only set Content-Type for JSON, not for FormData (browser handles it)
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...impersonationHeaders,
      ...options.headers,
    },
    credentials: 'include', // Always send cookies
    cache: 'no-store', // Never use browser cache, always fetch fresh from server
    ...options,
  };
// console.log(url, defaultOptions)
  const response = await fetch(url, defaultOptions);

  const responseData = await response.json();

  if (!response.ok) {
    // Handle the standardized error response from the backend
    const errorResponse = responseData as ApiErrorResponse;
    // console.log(errorResponse)
    // Extract the message from the nested error object
    const errorMessage = Array.isArray(errorResponse.error.message)
      ? errorResponse.error.message.join(', ')
      : errorResponse.error.message || (errorResponse.error as unknown as string);
    throw new Error(errorMessage || 'An unknown API error occurred.');
  }

  // Handle the standardized success response
  const successResponse = responseData as ApiResponse<T>;
  return successResponse.data;
};

/**
 * API client for binary/blob responses (e.g. PDF downloads).
 * Includes cookies and impersonation headers — identical setup to apiClient
 * but skips JSON parsing and returns the raw Blob instead.
 */
export const apiBlobClient = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Blob> => {
  const cleanedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = `/backend/${cleanedEndpoint}`;

  const impersonationHeaders = getImpersonationHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/pdf',
      ...impersonationHeaders,
      ...options.headers,
    },
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    // Try to parse a JSON error body; fall back to status text
    let message = `Request failed: ${response.statusText}`;
    try {
      const errData = await response.json() as ApiErrorResponse;
      message = Array.isArray(errData.error.message)
        ? errData.error.message.join(', ')
        : errData.error.message || message;
    } catch {
      // body wasn't JSON — keep fallback message
    }
    throw new Error(message);
  }

  return response.blob();
};

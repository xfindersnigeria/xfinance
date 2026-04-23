/**
 * Server-side auth utilities
 * These functions fetch whoami and validate permissions
 */

import { WhoamiResponse, MenuItem } from "@/lib/types";
import { ENUM_ROLE } from "@/lib/types/enums";
import { cookies } from "next/headers";
import { IMPERSONATION_COOKIE_NAMES } from "@/lib/utils/impersonation";


function getApiBaseUrl(): string {
  // Server-side — use internal URL directly
  // Never goes through Nginx or Next.js rewrites
  if (typeof window === 'undefined') {
    return process.env.API_URL || 'http://localhost:3000';
  }
  // Client-side — use relative URL, rewrite/Nginx handles it
  return '';
}
/**
 * Fetch whoami data server-side
 * This is called from proxy and dashboard layout
 * Results are cached by Next.js (5 min revalidate)
 */
export async function getWhoamiServer(headersObj: any): Promise<WhoamiResponse | null> {
  try {
    // let url = "/backend/auth/whoami";
    // console.log("header object", headersObj)
    // if (headersObj) {
    //   const protocol = headersObj.get("x-forwarded-proto") || "https";
    //   const host = headersObj.get("host");
    //   if (host) {
    //     url = `${protocol}://${host}/backend/auth/whoami`;
    //   }
    // }
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v1/auth/whoami`;
    
    console.log("Fetching whoami from URL:", url);
    const cookieStore = await cookies();
    const impersonatedGroupId = cookieStore.get(
      IMPERSONATION_COOKIE_NAMES.group,
    )?.value;
    const impersonatedEntityId = cookieStore.get(
      IMPERSONATION_COOKIE_NAMES.entity,
    )?.value;
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
      .join("; ");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    if (impersonatedGroupId) {
      headers["X-Impersonate-Group"] = impersonatedGroupId;
    }

    if (impersonatedEntityId) {
      headers["X-Impersonate-Entity"] = impersonatedEntityId;
    }

    // const response = await fetch(`${baseUrl}/api/v1/auth/whoami`, {
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null; // No auth cookie
      }
      console.error(`Failed to fetch whoami: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.data || data; // Handle both wrapped and unwrapped responses
  } catch (error) {
    console.error("Error fetching whoami:", error);
    return null;
  }
}

/**
 * Extract all allowed routes from menus
 * Routes can be direct or nested under categories with children
 *
 * Example returns:
 * ["/dashboard", "/income/invoices", "/income/customers", "/projects"]
 */
export function getAllowedRoutesFromMenus(menus: MenuItem[]): string[] {
  const routes: string[] = [];

  for (const menu of menus) {
    // Add direct route if it exists
    if (menu.route) {
      routes.push(menu.route);
    }

    // Add children routes if they exist
    if ("children" in menu && Array.isArray(menu.children)) {
      const children = menu.children as MenuItem[];
      for (const child of children) {
        if (child.route) {
          routes.push(child.route);
        }
      }
    }
  }

  return routes;
}

/**
 * Check if a pathname is allowed based on menu routes
 * Handles both exact matches and recursive paths
 *
 * Examples:
 * allowedRoutes = ["/income/invoices"]
 * pathname = "/income/invoices" → true (exact match)
 * pathname = "/income/invoices/edit/123" → true (recursive)
 * pathname = "/expense/bills" → false (not in allowed routes)
 */
export function isPathAllowed(
  allowedRoutes: string[],
  pathname: string,
): boolean {
  return allowedRoutes.some((route) => {
    // Exact match
    if (pathname === route) return true;
    // Recursive match (subpaths of allowed route)
    if (pathname.startsWith(route + "/")) return true;
    return false;
  });
}

/**
 * Check if user has permission to access a module (for client-side checks)
 * Kept for backward compatibility and client-side permission checks
 */
export function hasModulePermission(
  whoami: WhoamiResponse | null,
  moduleKey: string | null,
  requiredAction?: string,
): boolean {
  if (!whoami || !moduleKey) return false;

  const { user, permissions } = whoami;

  // Superadmins have all permissions
  if (user.systemRole === ENUM_ROLE.SUPERADMIN) {
    return true;
  }

  // Check if module exists in permissions
  const modulePermissions = permissions[moduleKey];
  if (!modulePermissions || modulePermissions.length === 0) {
    return false;
  }

  // If specific action is required, check if user has it
  if (requiredAction) {
    return modulePermissions.includes(requiredAction);
  }

  // Module has at least one permission
  return true;
}

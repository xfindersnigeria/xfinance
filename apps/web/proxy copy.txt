import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppSession } from "./lib/utils/cookies";
import { routePermissions } from "./lib/utils/permission-map";
import { ENUM_ROLE } from "./lib/types/enums";

// Define which paths should be protected by this middleware
const protectedPaths = [
  "/dashboard",
  "/sales",
  "/purchases",
  "/products",
  "/quick-sale",
  "/online-store",
  "/banking",
  "/hr",
  "/accounts",
  "/reports",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Prevent authenticated users from accessing /auth routes
  if (pathname.startsWith("/auth")) {
    const { user } = await getAppSession();
    if (user) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Check if the requested path is one of the protected routes
  //   const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isProtected = protectedPaths.some((path) => {
    // Only /dashboard should be exact, others should match subpaths
    if (path === "/dashboard") return pathname === path;
    return pathname === path || pathname.startsWith(path + "/");
  });
  if (isProtected) {
    // Get user session data from the cookies
    const { user } = await getAppSession();

    // 1. If no user is found, redirect to the login page with a redirect query
    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      // loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Superadmins and Admins have unrestricted access to all user-level pages
    if (
      user.systemRole === ENUM_ROLE.SUPERADMIN ||
      user.systemRole === ENUM_ROLE.ADMIN
    ) {
      // If on a module root (e.g., /sales), redirect to first submodule
      const pathSegment = pathname.split("/")[1];
      const required = routePermissions.get(pathSegment);
      if (
        pathname === `/${pathSegment}` &&
        Array.isArray(required) &&
        required.length > 0
      ) {
        // Map permission to submodule route (e.g., 'sales:customers:view' => 'customers')
        let submodule = "";
        if (required[0].includes(":")) {
          const parts = required[0].split(":");
          submodule = parts[1]
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .toLowerCase();
            // ₦
        }
        if (submodule) {
          const redirectUrl = new URL(
            `/${pathSegment}/${submodule}`,
            request.url,
          );
          return NextResponse.redirect(redirectUrl);
        }
      }
      return NextResponse.next();
    }

    // 3. For regular users, check their permissions for the entire section
    if (user.systemRole === ENUM_ROLE.USER) {
      const pathSegment = pathname.split("/")[1]; // e.g., 'sales'
      const required = routePermissions.get(pathSegment);
      const userPermissions = user.permissions || [];

      // If the route is in our permission map, we need to validate access
      if (required) {
        let hasPermission = false;
        let firstPermittedSubmodule = null;

        // If required is a string, treat as single permission
        if (typeof required === "string") {
          hasPermission = userPermissions.includes(required);
        } else if (Array.isArray(required)) {
          // Find the first permission the user has
          for (const perm of required) {
            if (userPermissions.includes(perm)) {
              hasPermission = true;
              firstPermittedSubmodule = perm;
              break;
            }
          }
        }

        // If the user has NO permissions for this entire section, redirect them.
        if (!hasPermission) {
          const dashboardUrl = new URL("/dashboard", request.url);
          return NextResponse.redirect(dashboardUrl);
        }

        // If user is on the module root (e.g., /sales), redirect to first permitted submodule
        if (
          pathname === `/${pathSegment}` &&
          Array.isArray(required) &&
          firstPermittedSubmodule
        ) {
          // Map permission to submodule route
          // Example: 'sales:chartOfAccounts:view' => 'chart-of-accounts'
          let submodule = "";
          if (firstPermittedSubmodule.includes(":")) {
            const parts = firstPermittedSubmodule.split(":");
            // Convert camelCase to kebab-case
            submodule = parts[1]
              .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
              .toLowerCase();
          }
          if (submodule) {
            const redirectUrl = new URL(
              `/${pathSegment}/${submodule}`,
              request.url,
            );
            return NextResponse.redirect(redirectUrl);
          }
        }
      }
    }
  }

  // If the path is not protected or the user has access, continue
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

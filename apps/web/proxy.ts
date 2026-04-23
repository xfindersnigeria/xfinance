import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppSession } from "./lib/utils/cookies";
import {
  getWhoamiServer,
  getAllowedRoutesFromMenus,
  isPathAllowed,
} from "./lib/server/auth";

// Define which paths should be protected by this middleware


// Paths that don't require specific module permissions
// (just auth cookie validation is enough)
const permissionExemptPaths = ["/dashboard", "/subscription", "/admin/customization"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
        // console.log(request.headers.get('host'))


  // Prevent authenticated users from accessing /auth routes
  if (pathname.startsWith("/auth")) {
    const { user } = await getAppSession();
    if (user) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  const isPublic = pathname.startsWith("/auth") || pathname === "/";
  // Check if the requested path is one of the protected routes
  // const isProtected = protectedPaths.some((path) => {
  // Only /dashboard should be exact, others should match subpaths
  // if (path === "/dashboard") return pathname === path;
  // return pathname === path || pathname.startsWith(path + "/");
  // });
  const isProtected = !isPublic; // All non-auth paths are protected, we will check permissions inside

  if (isProtected) {
    // Get user session data from the cookies
    const { user } = await getAppSession();

    // 1. If no user is found, redirect to the login page
    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Check if path is exempt from permission checking
    const isExempt = permissionExemptPaths.some((exemptPath) => {
      if (exemptPath === "/dashboard" || exemptPath === "/subscription") return pathname === exemptPath;
      return pathname === exemptPath || pathname.startsWith(exemptPath + "/");
    });

    // 3. For non-exempt paths, validate against menu routes
    if (!isExempt) {
      // Fetch whoami to get allowed routes
      const whoami = await getWhoamiServer(request.headers);

      if (whoami && whoami.menus) {
        // Extract all allowed routes from menus
        const allowedRoutes = getAllowedRoutesFromMenus(whoami.menus);

        // Check if user has permission to access this path
        if (!isPathAllowed(allowedRoutes, pathname)) {
          // User doesn't have permission - redirect to dashboard
          const dashboardUrl = new URL("/dashboard", request.url);
          return NextResponse.redirect(dashboardUrl);
        }
      }
    }

    // 4. User is authenticated and has permission, allow access
    return NextResponse.next();
  }

  // If the path is not protected, continue
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
    "/((?!api|backend|images|svgs|_next/static|_next/image|favicon.ico).*)",
  ],
};

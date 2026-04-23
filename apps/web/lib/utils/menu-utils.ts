import { ENUM_ROLE } from "../types/enums";
import { UserPayload, WhoamiResponse } from "../types";
import { superAdminMenu } from "../data/sidebarData";
import { LucideIcon } from "lucide-react";
import {
  AreaChart,
  BarChart3,
  BookCopy,
  BookUser,
  Briefcase,
  Building,
  FilePieChart,
  FileText,
  Home,
  LayoutDashboard,
  Landmark,
  Package,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
} from "lucide-react";

// Type for a menu item, which can also have sub-items
export type MenuItem = {
  isActive?: boolean;
  openInNewTab?: boolean;
  title: string;
  icon?: LucideIcon;
  url: string;
  matchUrls?: string[];
  requiredPermission?: string; // For single permission checks
  requiredPermissions?: string[]; // For "at least one" permission checks
};

export type SectionTabItem = {
  label: string;
  href: string;
};

const iconMap: Record<string, LucideIcon> = {
  "superadmin": LayoutDashboard,
  dashboard: Home,
  overview: LayoutDashboard,
  income: ShoppingCart,
  expense: Briefcase,
  products: Package,
  "assets & inventory": Building,
  "assets-and-inventory": Building,
  assets: Building,
  accounts: BookCopy,
  banking: Landmark,
  "hr & payroll": Users,
  "hr-and-payroll": Users,
  reports: AreaChart,
  settings: Settings,
  admin: UserCog,
  projects: Briefcase,
  intercompany: BarChart3,
  "group reports": FileText,
  "group-reports": FileText,
  "budgeting & forecasts": FilePieChart,
  "budgeting-and-forecasts": FilePieChart,
  "master chart of accounts": BookUser,
  "master-chart-of-accounts": BookUser,
};

function getMenuIcon(label: string, route?: string): LucideIcon | undefined {
  const normalizedLabel = label.trim().toLowerCase();
  const routeRoot = route?.split("/").filter(Boolean)[0]?.toLowerCase();

  if (iconMap[normalizedLabel]) {
    return iconMap[normalizedLabel];
  }

  if (routeRoot && iconMap[routeRoot]) {
    return iconMap[routeRoot];
  }

  return Home;
}

function buildDynamicSidebarMenu(whoami: WhoamiResponse): MenuItem[] {
  const items: MenuItem[] = [];

  // Sort menus by menuSortOrder (ascending, fallback to 0)
  const sortedMenus = [...(whoami.menus || [])].sort((a, b) => (a.menuSortOrder ?? 0) - (b.menuSortOrder ?? 0));

  for (const menu of sortedMenus) {
    if (menu.children && menu.children.length > 0) {
      // Sort children by moduleSortOrder (ascending, fallback to 0)
      const sortedChildren = [...menu.children].sort((a, b) => (a.moduleSortOrder ?? 0) - (b.moduleSortOrder ?? 0));
      const childRoutes = sortedChildren
        .map((child) => child.route)
        .filter((route): route is string => Boolean(route));

      if (childRoutes.length === 0) {
        continue;
      }

      items.push({
        title: menu.label,
        icon: getMenuIcon(menu.label, childRoutes[0]),
        url: childRoutes[0],
        matchUrls: childRoutes,
        isActive: true,
      });
      continue;
    }

    if (!menu.route) {
      continue;
    }

    items.push({
      title: menu.label,
      icon: getMenuIcon(menu.label, menu.route),
      url: menu.route,
      matchUrls: [menu.route],
      isActive: true,
    });
  }

  return items;
}

export function getSectionTabsFromWhoami(
  whoami: WhoamiResponse | null,
  sectionKey: string,
): SectionTabItem[] {
  if (!whoami?.menus?.length) {
    return [];
  }

  const normalizedKey = sectionKey.trim().toLowerCase();

  for (const menu of whoami.menus) {
    const normalizedLabel = menu.label.trim().toLowerCase();
    const normalizedMenu = menu.menu?.trim().toLowerCase();
    const routeRoot = menu.route?.split("/").filter(Boolean)[0]?.toLowerCase();
    const childRouteRoot = menu.children?.[0]?.route
      ?.split("/")
      .filter(Boolean)[0]
      ?.toLowerCase();

    const matchesSection =
      normalizedLabel === normalizedKey ||
      normalizedMenu === normalizedKey ||
      routeRoot === normalizedKey ||
      childRouteRoot === normalizedKey;

    if (!matchesSection) {
      continue;
    }

    if (menu.children?.length) {
      return menu.children
        .filter((child) => Boolean(child.route))
        .map((child) => ({
          label: child.label,
          href: child.route as string,
        }));
    }

    if (menu.route) {
      return [
        {
          label: menu.label,
          href: menu.route,
        },
      ];
    }
  }

  return [];
}

/**
 * Determines the correct sidebar menu based on the user's role and permissions.
 * @param user The user object from the session.
 * @param role The determined role for the current view (could be impersonated).
 * @returns The appropriate menu array for the sidebar.
 */
export function getSidebarMenu(
  user: UserPayload | null,
  role: ENUM_ROLE,
  whoami: WhoamiResponse | null,
) {
  if (!user) return [];
  return whoami ? buildDynamicSidebarMenu(whoami) : [];
}
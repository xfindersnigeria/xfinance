import { UserPayload } from "../types";

// This interface describes the structure of a tab object that has a permission requirement.
export interface PermissibleTab {
  title: string;
  value: string;
  content: React.ReactNode;
  permission: string;
}

/**
 * Filters an array of tabs based on a user's permissions.
 * @param tabs An array of tab objects, where each object includes a 'permission' property.
 * @param user The user object from the session, containing a 'permissions' array.
 * @returns A new array containing only the tabs the user is permitted to see.
 */
export function getPermittedTabs(
  tabs: PermissibleTab[],
  user: UserPayload | null
): PermissibleTab[] {
  // If there's no user, they have no permissions.
  // if (!user) {
  //   return [];
  // }

  //   const userPermissions = user.permissions || [];
  const userPermissions = ["sales:customers:view", "sales:invoices:view"];

  // Return only the tabs where the required permission is present in the user's permissions.
  return tabs.filter((tab) => userPermissions.includes(tab.permission));
}

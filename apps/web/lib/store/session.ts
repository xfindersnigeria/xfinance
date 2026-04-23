import { create } from "zustand";
import {
  UserPayload,
  WhoamiResponse,
  MenuItem,
  GroupImpersonationPayload,
  EntityImpersonationPayload,
} from "../types";
import { ENUM_ROLE } from "../types/enums";
import { getWhoami } from "../api/services/authService";
import {
  clearImpersonatedEntityCookie,
  clearImpersonatedGroupCookie,
  setImpersonatedEntityCookie,
  setImpersonatedGroupCookie,
} from "../utils/impersonation";

const getImpersonatedGroup = (
  whoami: WhoamiResponse | null,
): GroupImpersonationPayload | null => {
  const groupId = whoami?.impersonation?.impersonatedGroupId;
  if (!groupId) return null;

  return {
    groupId,
    groupName: whoami?.group?.name ?? "",
  };
};

const getImpersonatedEntity = (
  whoami: WhoamiResponse | null,
): EntityImpersonationPayload | null => {
  const entityId = whoami?.impersonation?.impersonatedEntityId;
  if (!entityId) return null;

  return {
    entityId,
    entityName: whoami?.context?.currentEntity?.name ?? "",
  };
};

const getEffectiveRoleFromWhoami = (
  whoami: WhoamiResponse | null,
): ENUM_ROLE | null => {
  if (!whoami?.user) return null;

  const baseRole = whoami.user.systemRole;
  const impersonation = whoami.impersonation;

  if (!impersonation?.isImpersonating) {
    return baseRole;
  }

  if (
    (baseRole === ENUM_ROLE.SUPERADMIN || baseRole === ENUM_ROLE.ADMIN) &&
    impersonation.impersonatedEntityId
  ) {
    return ENUM_ROLE.USER;
  }

  if (
    baseRole === ENUM_ROLE.SUPERADMIN &&
    impersonation.impersonatedGroupId
  ) {
    return ENUM_ROLE.ADMIN;
  }

  return baseRole;
};

// Define the state and actions for your store
interface SessionState {
  // Whoami response data
  whoami: WhoamiResponse | null;
  user: UserPayload | null;
  group: GroupImpersonationPayload | null;
  entity: EntityImpersonationPayload | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchSessionData: () => Promise<void>;
  refetchSessionDataSilently: () => Promise<void>;
  setWhoami: (whoami: WhoamiResponse) => void;
  clearSession: () => void;

  // Impersonation management
  setImpersonatedGroup: (groupId: string) => void;
  clearImpersonatedGroup: () => void;
  setImpersonatedEntity: (entityId: string) => void;
  clearImpersonatedEntity: () => void;

  // Helper functions
  hasPermission: (moduleKey: string, action?: string) => boolean;
  canAccessModule: (moduleKey: string) => boolean;
  getMenusByCategory: () => Record<string, MenuItem[]>;
  getCurrentEntity: () => { id: string; name: string } | null;
  getAvailableEntities: () => Array<{ id: string; name: string }>;
  getEffectiveRole: () => ENUM_ROLE | null;
  isImpersonating: () => boolean;
  isSuperadmin: () => boolean;
  isAdmin: () => boolean;
}

// Create the Zustand store
export const useSessionStore = create<SessionState>((set, get) => ({
  whoami: null,
  user: null,
  group: null,
  entity: null,
  loading: true,
  error: null,

  fetchSessionData: async () => {
    try {
      set({ loading: true, error: null });
      const response = await getWhoami();
      set({
        whoami: response,
        user: response.user,
        group: getImpersonatedGroup(response),
        entity: getImpersonatedEntity(response),
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch session data";
      console.error("Error fetching session data:", errorMessage);
      set({ error: errorMessage, loading: false });
    }
  },

  refetchSessionDataSilently: async () => {
    try {
      const response = await getWhoami();
      set({
        whoami: response,
        user: response.user,
        group: getImpersonatedGroup(response),
        entity: getImpersonatedEntity(response),
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to refetch session data";
      console.error("Error refetching session data:", errorMessage);
      set({ error: errorMessage });
    }
  },

  setWhoami: (whoami: WhoamiResponse) => {
    set({
      whoami,
      user: whoami.user,
      group: getImpersonatedGroup(whoami),
      entity: getImpersonatedEntity(whoami),
      loading: false,
      error: null,
    });
    // Persist logo so loading.tsx can show it before the store hydrates
    if (typeof window !== 'undefined') {
      const logo = whoami.customization?.logoUrl;
      if (logo) {
        localStorage.setItem('xf-logo-url', logo);
      } else {
        localStorage.removeItem('xf-logo-url');
      }
    }
  },

  clearSession: () => {
    set({
      whoami: null,
      user: null,
      group: null,
      entity: null,
      loading: false,
      error: null,
    });
    clearImpersonatedGroupCookie();
    clearImpersonatedEntityCookie();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('xf-logo-url');
    }
  },

  setImpersonatedGroup: (groupId: string) => {
    setImpersonatedGroupCookie(groupId);
  },

  clearImpersonatedGroup: () => {
    clearImpersonatedGroupCookie();
  },

  setImpersonatedEntity: (entityId: string) => {
    setImpersonatedEntityCookie(entityId);
  },

  clearImpersonatedEntity: () => {
    clearImpersonatedEntityCookie();
  },

  /**
   * Check if user has permission for a module and optionally a specific action
   * SUPERADMIN always returns true (empty permissions object)
   */
  hasPermission: (moduleKey: string, action?: string): boolean => {
    const { whoami } = get();
    if (!whoami || !whoami.user) return false;

    // Superadmin has all permissions
    if (whoami.user.systemRole === ENUM_ROLE.SUPERADMIN) {
      return true;
    }

    const permissions = whoami.permissions || {};
    const modulePermissions = permissions[moduleKey];

    // Module not in permissions = no access
    if (!modulePermissions) return false;

    // If specific action requested, check if it's allowed
    if (action) {
      return modulePermissions.includes(action);
    }

    // Just checking module access - need at least one permission
    return modulePermissions.length > 0;
  },

  /**
   * Check if user can access a module at all
   */
  canAccessModule: (moduleKey: string): boolean => {
    const { whoami } = get();
    if (!whoami || !whoami.user) return false;

    // Superadmin can access all modules
    if (whoami.user.systemRole === ENUM_ROLE.SUPERADMIN) {
      return true;
    }

    const permissions = whoami.permissions || {};
    const modulePermissions = permissions[moduleKey];

    // Module exists in permissions and has at least one action
    return modulePermissions && modulePermissions.length > 0;
  },

  /**
   * Group menus by category (menu field)
   * Used for rendering sidebar
   */
  getMenusByCategory: (): Record<string, MenuItem[]> => {
    const { whoami } = get();
    if (!whoami || !whoami.menus) return {};

    return whoami.menus.reduce(
      (grouped, item) => {
        const category = item.menu || "Other";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(item);
        return grouped;
      },
      {} as Record<string, MenuItem[]>
    );
  },

  /**
   * Get current entity context
   */
  getCurrentEntity: (): { id: string; name: string } | null => {
    const { whoami } = get();
    return whoami?.context?.currentEntity || null;
  },

  /**
   * Get available entities for entity switcher
   */
  getAvailableEntities: (): Array<{ id: string; name: string }> => {
    const { whoami } = get();
    return whoami?.availableEntities || [];
  },

  /**
   * Effective dashboard role after impersonation is applied.
   */
  getEffectiveRole: (): ENUM_ROLE | null => {
    const { whoami } = get();
    return getEffectiveRoleFromWhoami(whoami);
  },

  /**
   * Whether the current whoami response represents an impersonated context.
   */
  isImpersonating: (): boolean => {
    const { whoami } = get();
    return Boolean(whoami?.impersonation?.isImpersonating);
  },

  /**
   * Check if user is superadmin
   */
  isSuperadmin: (): boolean => {
    const { whoami } = get();
    return whoami?.user?.systemRole === ENUM_ROLE.SUPERADMIN;
  },

  /**
   * Check if user is admin
   */
  isAdmin: (): boolean => {
    const { whoami } = get();
    return whoami?.user?.systemRole === ENUM_ROLE.ADMIN;
  },
}));

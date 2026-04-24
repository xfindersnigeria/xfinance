import { ENUM_ROLE } from "./enums";

export type UserPayload = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  systemRole: ENUM_ROLE;
  permissions: string[];
  image: {
    secureUrl: string;
    publicId: string;
  } | null;
  // Add any other user properties you expect
};

export type GroupImpersonationPayload = {
  groupId: string;
  groupName: string;
};

export type EntityImpersonationPayload = {
  entityId: string;
  entityName: string;
};

// This type represents the complete session state
export type AppSession = {
  user: UserPayload | null;
  // group: GroupImpersonationPayload | null;
  // entity: EntityImpersonationPayload | null;
};

export type Group = {
  id: string;
  name: string;
  legalName: string;
  logo:  {
    secureUrl: string;
    publicId: string;
  } | null;
  taxId: string;
  industry: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
    userCount: string;
  entityCount: string;
  mrr: string;

  email: string;
  phone: string;
  website?: string | null;
  subscriptionId?: string | null;
  billingCycle?: string | null;
  // entities, groupRoles, users can be added as needed
  subscription?: any;
  createdAt: string;
  updatedAt: string;
};

export type Entity = {
  id: string;
  name: string;
  groupId: string;
  address?: string | null;
  city?: string | null;
  companyName?: string | null;
  country?: string | null;
  currency?: string | null;
  email?: string | null;
  legalName?: string | null;
  logo?: { publicId: string; secureUrl: string } | null;
  phoneNumber?: string | null;
  postalCode?: string | null;
  state?: string | null;
  taxId?: string | null;
  website?: string | null;
  yearEnd?: string | null;
};

// Menu item structure from whoami response
// Can be either a parent with children or a leaf item with a route
export type MenuItem = {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  module?: string;
  menu?: string;
  actions?: string[];
  children?: MenuItem[]; // For grouped menu items
  menuSortOrder?: number; // For sorting parent menus
  moduleSortOrder?: number; // For sorting child menu items
};

// Subscription module structure
export type SubscriptionModule = {
  id: string;
  key: string;
  name: string;
  scope: 'ADMIN' | 'USER' | 'SUPERADMIN';
};

// Subscription structure
export type Subscription = {
  id: string;
  tierId: string;
  tierName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  modules: SubscriptionModule[];
};

// Impersonation context
export type ImpersonationContext = {
  isImpersonating: boolean;
  originalGroupId?: string;
  impersonatedGroupId?: string;
  originalEntityId?: string;
  impersonatedEntityId?: string;
  impersonatedByUser?: string;
};

export type GroupCustomizationType = {
  primaryColor: string;
  logoUrl: string | null;
  loginBgUrl: string | null;
};

// Complete whoami response structure
export type WhoamiResponse = {
  user: UserPayload;
  group: {
    id: string;
    name: string;
    subdomain: string;
  };
  role: {
    id: string;
    name: string;
    scope: 'ADMIN' | 'USER' | 'SUPERADMIN';
    adminEntities: string[];
  } | null;
  context: {
    userId: string;
    groupId: string;
    entityId?: string;
    currentEntity?: {
      id: string;
      name: string;
    };
  };
  availableEntities: Array<{
    id: string;
    name: string;
  }>;
  menus: MenuItem[];
  permissions: Record<string, string[]>;
  subscription: Subscription | null;
  customization?: GroupCustomizationType;
  impersonation?: ImpersonationContext;
  cacheTTL: number;
  expiresAt: number;
};

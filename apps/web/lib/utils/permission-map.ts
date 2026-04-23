// import { userMenu } from '../data/sidebarData';

import { PERMISSIONS } from "./permissions";

// type PermissionMap = Map<string, string | string[]>;

// /**
//  * Creates a map of URL path segments to their required permissions.
//  * Example: 'sales' => ['sales:customers:view', 'sales:invoices:view', ...]
//  */
// function createRoutePermissionMap(): PermissionMap {
//   const map: PermissionMap = new Map();

//   userMenu.forEach((item) => {
//     if (item.url) {
//       // Extract the first segment of the URL, e.g., 'sales' from '/sales'
//       const pathSegment = item.url.split('/')[1];

//       if (pathSegment) {
//         const permissions =
//           item.requiredPermission || item.requiredPermissions || [];
//         map.set(pathSegment, permissions);
//       }
//     }
//   });

//   return map;
// }

// export const routePermissions: PermissionMap = createRoutePermissionMap();

// lib/utils/permission-map.ts

export const routePermissions = new Map<string, string | string[]>([
  ["dashboard", PERMISSIONS.DASHBOARD_VIEW],

  [
    "sales",
    [
      PERMISSIONS.SALES_CUSTOMERS_VIEW,
      PERMISSIONS.SALES_INVOICES_VIEW,
      PERMISSIONS.SALES_PAYMENT_RECEIVED_VIEW,
      PERMISSIONS.SALES_CREDIT_NOTES_VIEW,
    ],
  ],

  [
    "purchases",
    [
      PERMISSIONS.PURCHASES_VENDORS_VIEW,
      PERMISSIONS.PURCHASES_BILLS_VIEW,
      PERMISSIONS.PURCHASES_PAYMENT_MADE_VIEW,
      PERMISSIONS.PURCHASES_EXPENSES_VIEW,
      PERMISSIONS.PURCHASES_DEBIT_NOTES_VIEW,
    ],
  ],

  [
    "products",
    [
      PERMISSIONS.PRODUCTS_ITEMS_VIEW,
      PERMISSIONS.PRODUCTS_COLLECTIONS_VIEW,
      PERMISSIONS.PRODUCTS_INVENTORY_VIEW,
      PERMISSIONS.PRODUCTS_ORDERS_VIEW,
    ],
  ],

  ["quick-sale", PERMISSIONS.QUICK_SALE_VIEW],

  ["online-store", PERMISSIONS.ONLINE_STORE_MANAGEMENT_VIEW],
  ["assets", PERMISSIONS.ASSETS_VIEW],

  ["banking", PERMISSIONS.BANKING_VIEW],

  [
    "hr",
    [
      PERMISSIONS.HR_EMPLOYEES_VIEW,
      PERMISSIONS.HR_ATTENDANCE_VIEW,
      PERMISSIONS.HR_PAYROLL_VIEW,
      PERMISSIONS.HR_MANAGE_LEAVE_VIEW,
    ],
  ],

  [
    "accounts",
    [
      PERMISSIONS.ACCOUNTS_CHART_OF_ACCOUNTS_VIEW,
      PERMISSIONS.ACCOUNTS_OPENING_BALANCE_VIEW,
      PERMISSIONS.ACCOUNTS_MANUAL_JOURNAL_VIEW,
      PERMISSIONS.ACCOUNTS_CURRENCY_ADJUSTMENT_VIEW,
      PERMISSIONS.ACCOUNTS_BUDGET_VIEW,
    ],
  ],

  ["reports", PERMISSIONS.REPORTS_VIEW],

  [
    "settings",
    [
      PERMISSIONS.SETTINGS_ORGANIZATION_VIEW,
      PERMISSIONS.SETTINGS_USERS_AND_ROLES_VIEW,
      PERMISSIONS.SETTINGS_SETUP_AND_CONFIGURATION_VIEW,
      PERMISSIONS.SETTINGS_SALES_SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_PURCHASE_SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_PRODUCT_VIEW,
      PERMISSIONS.SETTINGS_TAX_VIEW,
      PERMISSIONS.SETTINGS_GENERAL_SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_EMAIL_SETTINGS_VIEW,
    ],
  ],
]);

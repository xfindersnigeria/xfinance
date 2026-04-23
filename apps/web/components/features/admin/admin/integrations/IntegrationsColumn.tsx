export interface IntegrationItem {
  id: string;
  title: string;
  description: string;
  status: "Connected" | "Disconnected" | "Pending";
  icon: string;
  configuredDate?: string;
}

export const integrationsData: IntegrationItem[] = [
  {
    id: "1",
    title: "ERP System",
    description: "Oracle NetSuite integration for centralized data synchronization",
    status: "Connected",
    icon: "📊",
    configuredDate: "2025-09-15",
  },
  {
    id: "2",
    title: "Bank Feeds",
    description: "Automated bank transaction import from major banking partners",
    status: "Connected",
    icon: "🏦",
    configuredDate: "2025-08-22",
  },
  {
    id: "3",
    title: "SSO Integration",
    description: "Single Sign-On with Azure AD for centralized user authentication",
    status: "Connected",
    icon: "🔐",
    configuredDate: "2025-07-10",
  },
  {
    id: "4",
    title: "Data Warehouse",
    description: "Snowflake data warehouse connection for reporting and analytics",
    status: "Pending",
    icon: "💾",
  },
];

export function getStatusColor(status: string) {
  switch (status) {
    case "Connected":
      return "bg-green-100 text-green-800";
    case "Disconnected":
      return "bg-red-100 text-red-800";
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

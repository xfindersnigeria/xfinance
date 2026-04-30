"use client";

import React, { useState } from "react";
import { Building2 } from "lucide-react";
import { CustomTable, Column } from "@/components/local/custom/custom-table";
import { Badge } from "@/components/ui/badge";
import { useGroups } from "@/lib/api/hooks/useGroup";
import { useDebounce } from "use-debounce";
import { Group } from "@/lib/types";
import GroupsActions from "./GroupsActions";

interface GroupRow {
  id: string;
  groupName: string;
  groupCode: string;
  legalName: string;
  industry: string;
  plan: string;
  entities: number;
  users: number;
  status: string;
  lastActive: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  website?: string | null;
  taxId: string;
  mrr: string;
  logo?: {
    publicId: string;
    secureUrl: string;
  };
  billingCycle?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transform API Group data to GroupRow format for table display
 * Maps backend fields to frontend table fields
 */
function transformGroupToRow(group: Group): GroupRow {
  // Map subscription ID to plan tier (capitalize first letter)
  const getPlanTier = (subscriptionId?: string | null): string => {
    if (!subscriptionId) return 'Professional';
    return subscriptionId.charAt(0).toUpperCase() + subscriptionId.slice(1);
  };

  return {
    id: group.id,
    groupName: group.name || group.legalName || 'Unknown',
    groupCode: `GRP-${group.id.slice(0, 6).toUpperCase()}`,
    legalName: group.legalName || '',
    industry: group.industry || 'N/A',
    plan: getPlanTier(group.subscriptionId),
    entities: Number(group.entityCount),
    users: Number(group.userCount),
    mrr: String(group.mrr),
    status: 'Active',
    lastActive: group.updatedAt ? new Date(group.updatedAt).toLocaleDateString() : new Date(group.createdAt).toLocaleDateString(),
    address: group.address || '',
    city: group.city || '',
    province: group.province || '',
    postalCode: group.postalCode || '',
    country: group.country || '',
    email: group.email || '',
    phone: group.phone || '',
    website: group.website || '',
    taxId: group.taxId || '',
    logo: group.logo ? {
      publicId: group.logo.publicId,
      secureUrl: group.logo.secureUrl,
    } : undefined,
    billingCycle: group.billingCycle,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function getPlanColor(plan: string) {
  switch (plan) {
    case "Enterprise":
      return "bg-green-100 text-green-800";
    case "Professional":
      return "bg-indigo-100 text-indigo-800";
    case "Starter":
      return "bg-blue-100 text-primary";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Trial":
      return "bg-yellow-100 text-yellow-800";
    case "Suspended":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function GroupsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // Fetch groups with search, filter, and pagination
  const { data = { groups: [], totalCount: 0 }, isLoading } = useGroups({
    search: debouncedSearchTerm,
    page: currentPage,
    limit: rowsPerPage,
    status: statusFilter === "All Statuses" ? undefined : statusFilter,
  });

  const groups = data.groups || [];
  const transformedGroups: GroupRow[] = groups.map(transformGroupToRow);
    
  const columns: Column<GroupRow>[] = [
    {
      key: "groupName",
      title: "GROUP",
      className: "text-xs font-medium",
      render: (value: string, row: GroupRow) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.groupCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "industry",
      title: "INDUSTRY",
      className: "text-xs",
    },
    {
      key: "plan",
      title: "PLAN",
      className: "text-xs",
      render: (value: string) => (
        <Badge className={`${getPlanColor(value)} text-xs font-medium`}>
          {value}
        </Badge>
      ),
    },
    {
      key: "entities",
      title: "ENTITIES",
      className: "text-xs text-center",
    },
    {
      key: "users",
      title: "USERS",
      className: "text-xs",
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <span className="text-gray-500">👥</span>
          {value}
        </div>
      ),
    },
    {
      key: "mrr",
      title: "MRR",
      className: "text-xs font-medium text-gray-900",
      render: (value: string | number) => {
        if (!value) return '₦0.00';
        
        // If it's already a formatted string, return it
        if (typeof value === 'string' && value.includes('₦')) {
          return value;
        }
        
        // If it's a number or numeric string, format it
        const amount = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
        }).format(amount);
      },
    },
    {
      key: "status",
      title: "STATUS",
      className: "text-xs",
      render: (value: string) => (
        <Badge className={`${getStatusColor(value)} text-xs font-medium`}>
          {value}
        </Badge>
      ),
    },
    {
      key: "lastActive",
      title: "LAST ACTIVE",
      className: "text-xs text-gray-600",
    },
    {
      key: "id",
      title: "",
      className: "w-8 text-xs",
      render: (_, row) => <GroupsActions row={row} />,
      searchable: false,
    },
  ];

  return (
    <div className="space-y-4">
      <CustomTable
        searchPlaceholder="Search groups..."
        tableTitle="All Groups"
        columns={columns}
        data={transformedGroups}
        pageSize={rowsPerPage}
        onSearchChange={setSearchTerm}
        statusOptions={["All Statuses", "Active", "Trial", "Suspended"]}
        onStatusChange={setStatusFilter}
        display={{
          statusComponent: true,
          filterComponent: false,
          searchComponent: true,
        }}
        loading={isLoading}
      />
    </div>
  );
}

"use client";

import React from "react";
import { CustomTabs } from "@/components/local/custom/tabs";
import Users from "./users/Users";
import Roles from "./roles/Roles";

/**
 * Users & Roles management page
 * Tabbed interface for managing users and their roles
 */
export default function UsersRoles() {
  const tabs = [
    {
      title: "Users",
      value: "users",
      content: <Users />,
    },
    {
      title: "Roles",
      value: "roles",
      content: <Roles />,
    },
  ];

  return (
    <div className="space-y-4">
      <CustomTabs
        tabs={tabs}
        storageKey="users-roles-tab"
        variant="button"
      />
    </div>
  );
}

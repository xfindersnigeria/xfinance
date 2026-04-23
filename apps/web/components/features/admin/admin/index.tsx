"use client";

import { useState, useMemo } from "react";
import { CustomTabs } from "@/components/local/custom/tabs";
import Entities from "./entities";
import UsersRoles from "./users-roles";
import AuditTrail from "./audit-trail";
import Integrations from "./integrations";
import Settings from "./settings";
import Customization from "./customization";

export default function AdminPage() {
  const tabs = useMemo(
    () => [
      {
        title: "Entities",
        value: "entities",
        content: <Entities />,
      },
      {
        title: "Users & Roles",
        value: "users",
        content: <UsersRoles />,
      },
      {
        title: "Audit Trail",
        value: "audit",
        content: <AuditTrail />,
      },
      {
        title: "Integrations",
        value: "integrations",
        content: <Integrations />,
      },
      {
        title: "Settings",
        value: "settings",
        content: <Settings />,
      },
      {
        title: "Customization",
        value: "customization",
        content: <Customization />,
      },
    ],
    []
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600 mt-2">
          Group-level settings, entities, users, and compliance
        </p>
      </div>

      {/* Custom Tabs */}
      <CustomTabs tabs={tabs} storageKey="admin-active-tab" classNames="px-4" />
    </div>
  );
}

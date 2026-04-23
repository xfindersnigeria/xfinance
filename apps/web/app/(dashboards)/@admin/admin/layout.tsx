"use client";

import RouteTabNav from "@/components/local/custom/route-tab-nav";
import { useSessionStore } from "@/lib/store/session";
import { getSectionTabsFromWhoami } from "@/lib/utils/menu-utils";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const whoami = useSessionStore((state) => state.whoami);
  const tabs = getSectionTabsFromWhoami(whoami, "admin");
  console.log("AdminLayout tabs:", tabs) // Debug log to check the tabs being generated

  return (
    <>
      {/* <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-2">
            Group-level settings, entities, users, and compliance
          </p>
        </div>
      </div> */}

      {tabs.length > 0 && <RouteTabNav tabs={tabs} />}
      <main className="p-4">{children}</main>
    </>
  );
}

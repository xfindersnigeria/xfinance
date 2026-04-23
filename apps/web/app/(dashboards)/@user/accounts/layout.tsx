"use client";

import RouteTabNav from "@/components/local/custom/route-tab-nav";
import { useSessionStore } from "@/lib/store/session";
import { getSectionTabsFromWhoami } from "@/lib/utils/menu-utils";

export default function AccountsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const whoami = useSessionStore((state) => state.whoami);
  const tabs = getSectionTabsFromWhoami(whoami, "accounts");

  return (
    <>
      {tabs.length > 0 && <RouteTabNav tabs={tabs} />}
      <main className="p-4">{children}</main>
    </>
  );
}

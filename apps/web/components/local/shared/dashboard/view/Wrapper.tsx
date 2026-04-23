"use client";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppSidebar } from "../sidebar/app-sidebar";

import { ENUM_ROLE } from "@/lib/types/enums";
import { useSessionStore } from "@/lib/store/session";

import Header from "../../Header";

type ActiveContext = {
  realRole?: ENUM_ROLE;
  effectiveRole: ENUM_ROLE;
  isImpersonating: boolean;
  groupName?: string;
  entityName?: string;
};

export default function Wrapper({
  children,
  pageTitle,
  role = ENUM_ROLE.USER,
  wrapperStyle,
}: {
  wrapperStyle?: string;
  children: React.ReactNode;
  pageTitle?: string;
  role?: ENUM_ROLE;
}) {
  const user = useSessionStore((state) => state.user);
  const group = useSessionStore((state) => state.group);
  const entity = useSessionStore((state) => state.entity);
  const whoami = useSessionStore((state) => state.whoami);
  const loading = useSessionStore((state) => state.loading);

  // console.log('📦 [Wrapper] Rendered with entityName:', whoami?.context?.currentEntity?.name);

  const activeContext: ActiveContext = {
    realRole: whoami?.user?.systemRole,
    effectiveRole: role,
    isImpersonating: Boolean(whoami?.impersonation?.isImpersonating),
    groupName: whoami?.group?.name ?? group?.groupName,
    entityName:
      whoami?.context?.currentEntity?.name ?? entity?.entityName,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} role={role} />
      <SidebarInset>
        <Header
          role={role}
          user={user}
          activeContext={activeContext}
          loading={loading}
        />
        <div className="flex-1 min-h-screen bg-background-subtle">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

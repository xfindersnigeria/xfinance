"use client";

import * as React from "react";
import { startTransition } from "react";
import { useRouter } from "next/navigation";

import { NavMain } from "./nav-main";
import { GroupSwitcher } from "./group-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getSidebarMenu } from "@/lib/utils/menu-utils";
import { ENUM_ROLE } from "@/lib/types/enums";
import { UserPayload } from "@/lib/types";
import Logo from "../../Logo";
import GroupEntitySwitcher from "./group-entity-switcher";
import { EntitySwitcher } from "./entity-switcher";
import { toast } from "sonner";
import {
  useImpersonateEntity,
  useRefreshWhoami,
  useStopEntityImpersonation,
} from "@/lib/api/hooks/useAuth";
import { useSessionStore } from "@/lib/store/session";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role: ENUM_ROLE;
  user: UserPayload | null;
}

export function AppSidebar({ role, user, ...props }: AppSidebarProps) {
  const router = useRouter();
  const whoami = useSessionStore((state) => state.whoami);
  const logoUrl = useSessionStore((state) => state.whoami?.customization?.logoUrl ?? undefined);
  // console.log(whoami)
  const currentEntity = useSessionStore((state) => state.entity);
  const clearImpersonatedEntity = useSessionStore(
    (state) => state.clearImpersonatedEntity,
  );
  const availableEntities = useSessionStore((state) => state.getAvailableEntities());
  const setImpersonatedEntity = useSessionStore(
    (state) => state.setImpersonatedEntity,
  );
  const refreshWhoami = useRefreshWhoami();
  const hasEntityOptions = availableEntities.length > 0;
  const [pendingView, setPendingView] = React.useState<"group" | "entity" | null>(null);
  const menuData = React.useMemo(
    () => getSidebarMenu(user, role, whoami),
    [user, role, whoami],
  );
  const activeView = currentEntity?.entityId ? "entity" : "group";

  const { mutate: impersonateEntity, isPending: isStartingEntityImpersonation } = useImpersonateEntity({
    onSuccess: async (data, variables) => {
      setImpersonatedEntity(data?.entityId || variables.entityId);

      try {
        await refreshWhoami();
        setPendingView(null);
        startTransition(() => {
          router.replace("/dashboard");
          router.refresh();
        });
      } catch (error) {
        setPendingView(null);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to refresh session context.",
        );
      }
    },
    onError: (error) => {
      setPendingView(null);
      toast.error(error.message || "Failed to switch to entity view.");
    },
  });

  const { mutate: stopEntityImpersonation, isPending: isStoppingEntityImpersonation } = useStopEntityImpersonation({
    onSuccess: async () => {
      clearImpersonatedEntity();

      try {
        await refreshWhoami();
        setPendingView(null);
        startTransition(() => {
          router.replace("/dashboard");
          router.refresh();
        });
      } catch (error) {
        setPendingView(null);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to refresh session context.",
        );
      }
    },
    onError: (error) => {
      setPendingView(null);
      toast.error(error.message || "Failed to switch view.");
    },
  });

  const handleGroupClick = () => {
    if (activeView === "group" || pendingView) {
      return;
    }

    setPendingView("group");
    stopEntityImpersonation();
  };

  const handleEntityClick = () => {
    if (activeView === "entity" || pendingView || !hasEntityOptions) {
      return;
    }

    const firstEntity = availableEntities[0];

    if (!firstEntity) {
      return;
    }

    setPendingView("entity");
    impersonateEntity({
      entityId: firstEntity.id,
      entityName: firstEntity.name,
    });
  };

  const showGroupEntitySwitcher =
    Boolean(user) && user?.systemRole !== ENUM_ROLE.USER && role !== ENUM_ROLE.SUPERADMIN;

  return (
    <Sidebar collapsible="icon" {...props}>
      <div className="w-full flex items-center justify-center px-2 py-1 bg-white">
        {" "}
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-transparent hover:bg-transparent hover:text-white "
        >
          <div>
            <Logo logoUrl={logoUrl} />{" "}
          </div>
        </SidebarMenuButton>
      </div>
      {/* <Separator className="" /> */}
      <SidebarHeader className="bg-white">
        {user && user.systemRole === ENUM_ROLE.SUPERADMIN && <GroupSwitcher />}
        {showGroupEntitySwitcher && (
          <GroupEntitySwitcher
            activeView={activeView}
            showEntityTab={hasEntityOptions}
            pendingView={pendingView}
            onGroupClick={handleGroupClick}
            onEntityClick={handleEntityClick}
          />
        )}
        {showGroupEntitySwitcher && activeView === "entity" && hasEntityOptions && (
          <EntitySwitcher
            entities={availableEntities}
            isLoading={false}
          />
        )}
      </SidebarHeader>
      <SidebarContent className="scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-primary bg-white">
        <NavMain items={menuData} />
      </SidebarContent>
      {/* <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  );
}

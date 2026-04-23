"use client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function GroupEntitySwitcher({
  activeView,
  showEntityTab,
  pendingView,
  onGroupClick,
  onEntityClick,
}: {
  activeView: "group" | "entity";
  showEntityTab: boolean;
  pendingView: "group" | "entity" | null;
  onGroupClick: () => void;
  onEntityClick: () => void;
}) {
  const isGroupActive = activeView === "group";
  const isEntityActive = activeView === "entity";
  const isGroupPending = pendingView === "group";
  const isEntityPending = pendingView === "entity";
  const isBusy = pendingView !== null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="w-full">
          <div className="flex w-full rounded-lg bg-slate-100 p-1">
            <Button
              type="button"
              size="sm"
              variant={isGroupActive ? "default" : "ghost"}
              className="h-9 flex-1 rounded-md"
              onClick={onGroupClick}
              disabled={isBusy || isGroupActive}
            >
              {isGroupPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Group
            </Button>
            {showEntityTab && (
              <Button
                type="button"
                size="sm"
                variant={isEntityActive ? "default" : "ghost"}
                className="h-9 flex-1 rounded-md"
                onClick={onEntityClick}
                disabled={isBusy || isEntityActive}
              >
                {isEntityPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Entity
              </Button>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

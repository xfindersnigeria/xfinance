"use client";

import * as React from "react";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Entity } from "@/lib/types";
import { useSessionStore } from "@/lib/store/session";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  useImpersonateEntity,
  useRefreshWhoami,
} from "@/lib/api/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EntitySwitcherProps {
  entities: Array<Pick<Entity, "id" | "name">>;
  isLoading: boolean;
}

export function EntitySwitcher({ entities, isLoading }: EntitySwitcherProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Use whoami.context.entityId as the source of truth — it is always set to the
  // effective entity (own or impersonated), unlike state.entity which is null
  // until the first explicit entity switch in a session.
  const currentEntityId = useSessionStore(
    (state) => state.whoami?.context?.entityId,
  );
  const setImpersonatedEntity = useSessionStore(
    (state) => state.setImpersonatedEntity,
  );
  const refreshWhoami = useRefreshWhoami();

  // isSwitching covers the full async window: API call + refreshWhoami + cache bust
  const [isSwitching, setIsSwitching] = React.useState(false);

  const { mutate: impersonateEntity } = useImpersonateEntity({
    onSuccess: async (data, variables) => {
      setImpersonatedEntity(data?.entityId || variables.entityId);
      try {
        await refreshWhoami();
        await queryClient.invalidateQueries();
        startTransition(() => {
          router.replace("/dashboard");
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to refresh session context.",
        );
      } finally {
        setIsSwitching(false);
      }
    },
    onError: (error) => {
      setIsSwitching(false);
      toast.error(error.message || "Failed to switch entity view.");
    },
  });

  const handleValueChange = (entityId: string) => {
    const entity = entities.find((e) => e.id === entityId);
    if (entity && entity.id !== currentEntityId) {
      setIsSwitching(true);
      impersonateEntity({ entityId: entity.id, entityName: entity.name });
    }
  };

  if (isLoading) {
    return (
      <div className="px-2 py-1">
        <div className="h-9 w-full animate-pulse rounded-md bg-gray-200" />
      </div>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="w-full">
          <div className="w-full px-0 relative">
            <Select
              value={currentEntityId ?? undefined}
              onValueChange={handleValueChange}
              disabled={isSwitching || entities.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an entity..." />
              </SelectTrigger>
              <SelectContent className="w-full">
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isSwitching && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60 backdrop-blur-[1px]">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

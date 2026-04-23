"use client";

import * as React from "react";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
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

interface EntitySwitcherProps {
  entities: Array<Pick<Entity, "id" | "name">>;
  isLoading: boolean;
}

export function EntitySwitcher({ entities, isLoading }: EntitySwitcherProps) {
  const router = useRouter();
  const [selectedEntity, setSelectedEntity] = React.useState<
    string | undefined
  >();
  const currentEntity = useSessionStore((state) => state.entity);
  const setImpersonatedEntity = useSessionStore(
    (state) => state.setImpersonatedEntity,
  );
  const refreshWhoami = useRefreshWhoami();

  const { mutate: impersonateEntity, isPending: isImpersonating } =
    useImpersonateEntity({
      onSuccess: async (data, variables) => {
        setImpersonatedEntity(data?.entityId || variables.entityId);
        try {
          await refreshWhoami();
          startTransition(() => {
            router.replace("/dashboard");
            router.refresh();
          });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to refresh session context.",
          );
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to switch entity view.");
      },
    });

  React.useEffect(() => {
    if (
      currentEntity?.entityId &&
      entities.some((e) => e.id === currentEntity.entityId)
    ) {
      setSelectedEntity(currentEntity.entityId);
    } else {
      setSelectedEntity(undefined);
    }
  }, [entities, currentEntity?.entityId]);

  const handleValueChange = (entityId: string) => {
    const entity = entities.find((e) => e.id === entityId);
    if (entity && entity.id !== currentEntity?.entityId) {
      setSelectedEntity(entity.id);
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
          <div className="w-full px-0">
            <Select
              value={selectedEntity}
              onValueChange={handleValueChange}
              disabled={isImpersonating || entities.length === 0}
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
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

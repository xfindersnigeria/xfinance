// components/SchoolSwitcher.tsx
"use client";

import * as React from "react";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  GalleryVerticalEnd,
  Loader2,
  Search,
  UserCog,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useDebounce } from "use-debounce";
import { ENUM_ROLE } from "@/lib/types/enums";
import { Group } from "@/lib/types";
import { useSessionStore } from "@/lib/store/session";
import NoData from "@/components/local/shared/NoData";
import { useImpersonateGroup, useRefreshWhoami, useStopEntityImpersonation, useStopGroupImpersonation } from "@/lib/api/hooks/useAuth";
import { useGroups } from "@/lib/api/hooks/useGroup";
import { toast } from "sonner";

export function GroupSwitcher() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [activeGroup, setActiveGroup] = React.useState<Group | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [pendingGroupId, setPendingGroupId] = React.useState<string | null>(null);
  const user = useSessionStore((state) => state.user);
  const group = useSessionStore((state) => state.group);
  const setImpersonatedGroup = useSessionStore((state) => state.setImpersonatedGroup);
  const clearImpersonatedGroup = useSessionStore((state) => state.clearImpersonatedGroup);
  const clearImpersonatedEntity = useSessionStore((state) => state.clearImpersonatedEntity);
  const refreshWhoami = useRefreshWhoami();

  const { mutate: impersonate, isPending: isImpersonating } =
    useImpersonateGroup({
      onSuccess: async (data, variables) => {
        setImpersonatedGroup(data?.groupId || variables.groupId);
        clearImpersonatedEntity();
        try {
          await refreshWhoami();
          setPendingGroupId(null);
          setOpen(false);
          startTransition(() => {
            router.replace("/dashboard");
            router.refresh();
          });
        } catch (error) {
          setPendingGroupId(null);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to refresh session context.",
          );
        }
      },
      onError: (error) => {
        setPendingGroupId(null);
        toast.error(error.message || "Failed to switch group view.");
      },
    });

  const { mutate: stopEntityImpersonating, isPending: isStoppingEntityImpersonation } =
    useStopEntityImpersonation({
      onSuccess: async () => {
        clearImpersonatedEntity();
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

  const { mutate: stopGroupImpersonating, isPending: isStoppingGroupImpersonation } =
    useStopGroupImpersonation({
      onSuccess: async () => {
        clearImpersonatedGroup();
        clearImpersonatedEntity();
        try {
          await refreshWhoami();
          setOpen(false);
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
        toast.error(error.message || "Failed to switch to SuperAdmin view.");
      },
    });

  // Fetch groups
  // later add paginationa dn search to this
  const { data: groupsData, isLoading, isFetching } = useGroups();

  const groups = React.useMemo(() => (groupsData as any)?.groups || [], [groupsData]);
  const total = groups.length; // No pagination for now
  const hasMore = false; // No pagination for now

  // console.log(user);

  // Set active group based on group.groupId
  React.useEffect(() => {
    if (group?.groupId && groups.length > 0) {
      const currentGroup = groups.find((g: any) => g.id === group.groupId);
      setActiveGroup(currentGroup || null);
    } else {
      setActiveGroup(null);
    }
  }, [group?.groupId, groups]);

  // Switch to a group (view_as: ADMIN)
  const switchToGroup = (group: Group) => {
    // console.log("Switching to group:", group);
    setPendingGroupId(group.id);
    impersonate({ groupId: group.id, groupName: group.name });
  };

  // Switch to SuperAdmin
  const switchToSuperAdmin = () => {
    if (!group?.groupId) return;
    stopGroupImpersonating();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border-white border"
            >
              <div className="flex aspect-square size-6 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {activeGroup ? (
                  <Image
                    src={
                      activeGroup?.logo?.secureUrl
                        ? activeGroup?.logo?.secureUrl
                        : `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
                            activeGroup.name
                          )}`
                    }
                    alt=""
                    className="size-4 object-cover"
                    width={16}
                    height={16}
                    priority
                  />
                ) : (
                  <GalleryVerticalEnd className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeGroup?.name || "Select a Group"}
                </span>
                <span className="truncate text-xs">
                  {activeGroup?.subscription?.name || ""}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DialogTrigger>
          <DialogContent className={`p-4 ${isMobile ? "w-full" : "max-w-lg"}`}>
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="sr-only">Groups</DialogTitle>
              {user?.systemRole === ENUM_ROLE.SUPERADMIN && group !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchToSuperAdmin}
                  className="flex items-center gap-2"
                  disabled={
                    isImpersonating ||
                    isStoppingGroupImpersonation ||
                    isStoppingEntityImpersonation ||
                    !group?.groupId
                  }
                >
                  {isStoppingGroupImpersonation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCog className="h-4 w-4" />
                  )}
                  Switch to SuperAdmin
                </Button>
              )}
            </DialogHeader>
            <div className="my-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  disabled={true} // Disabled for now
                />
              </div>
            </div>
            <ScrollArea className="h-75 rounded-md border">
              <div className="p-2 space-y-2">
                {isLoading || isFetching ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : groups.length > 0 ? (
                  groups.map((group: any) => (
                    <div
                      key={group.id}
                      onClick={() => switchToGroup(group)}
                      className={`flex items-center gap-2 p-2 rounded-lg border ${
                        isImpersonating
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-accent cursor-pointer"
                      }`}
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        {pendingGroupId === group.id && isImpersonating ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : group ? (
                          <Image
                            src={
                              group?.logo?.secureUrl
                                ? group?.logo?.secureUrl
                                : `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
                                    group.name
                                  )}`
                            }
                            alt=""
                            className="size-4 object-cover"
                            width={16}
                            height={16}
                          />
                        ) : (
                          <GalleryVerticalEnd className="size-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{group.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {group?.subscription?.name}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <NoData text={"No Group Found"} />
                )}
                {hasMore && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={isFetching}
                  >
                    {isFetching && <Loader2 className="animate-spin w-4 h-4" />}
                    {isFetching ? "Loading..." : "Load More"}
                  </Button>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

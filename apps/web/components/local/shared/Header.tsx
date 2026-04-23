"use client";
import {
  Bell,
  ChevronDown,
  Circle,
  CreditCard,
  Loader2,
  Pencil,
  Search as SearchIcon,
  Store,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import Logout from "./Logout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ENUM_ROLE } from "@/lib/types/enums";
import { SidebarTrigger } from "@/components/ui/sidebar";
import CustomBreadcrumb from "../custom/custom-breadcrumb";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/session";
import { useLogout } from "@/lib/api/hooks/useAuth";
import { toast } from "sonner";

function hasProductsMenu(menu: any[]): boolean {
  return menu.some((item) => item.label === "Products");
}

export default function Header({
  user,
  activeContext,
  loading,
  role,
}: {
  user?: any;
  activeContext?: {
    realRole?: ENUM_ROLE;
    effectiveRole: ENUM_ROLE;
    isImpersonating: boolean;
    groupName?: string;
    entityName?: string;
  };
  loading?: boolean;
  role: ENUM_ROLE;
}) {
  const router = useRouter();
  const whoami = useSessionStore((state) => state.whoami);
  const result = hasProductsMenu(whoami?.menus || []);
  // console.log("Header whoami:", whoami); // Debug log to check whoami data
  const contextLabel =
    activeContext?.effectiveRole === ENUM_ROLE.USER
      ? activeContext?.entityName || activeContext?.groupName || "Entity"
      : activeContext?.effectiveRole === ENUM_ROLE.ADMIN
        ? activeContext?.groupName || "Group"
        : "SuperAdmin";

  // console.log('📋 [Header] Rendering with entityName:', activeContext?.entityName);
  const logout = useLogout();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch (err) {
      console.error("Logout error:", err);

      let msg = "Unable to log out. Please try again.";
      if (
        typeof err === "object" &&
        err !== null &&
        "data" in err &&
        typeof (err as any).data === "object" &&
        (err as any).data !== null &&
        "message" in (err as any).data
      ) {
        msg = (err as any).data.message;
      }

      toast.error(msg, { position: "top-right" });
    }
  };

  return (
    <header className="h-16 flex items-center justify-between bg-white border-b gap-2 shadow-none sticky px-2 top-0 z-10">
      {/* Left Section */}
      <div
        className="flex items-center gap-2"
        style={{ flexBasis: "40%", maxWidth: "40%" }}
      >
        <SidebarTrigger />
        <CustomBreadcrumb
          role={role}
          activeContext={activeContext}
          loading={loading}
        />
      </div>

      {/* Right Section */}
      <div className="flex flex-1 items-center justify-end gap-4">
        {/* <Button
          variant="outline"
          className="hidden items-center gap-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 sm:flex"
        >
          <Circle className="size-3 fill-green-500 text-green-500" />
          <span className="font-semibold">Demo Mode</span>
        </Button> */}
        {result && (
          <Button className="hidden items-center gap-2 bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex">
            <Store className="size-4" />
            Quick Sale
          </Button>
        )}

        <div className="relative w-full max-w-xs  hidden md:block">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="rounded-full bg-gray-100 pl-10"
          />
        </div>
        <div className=" md:hidden">
          <SearchIcon className="size-4 text-muted-foreground" />
        </div>

        <div className="relative">
          <Bell className="size-4 text-muted-foreground" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex cursor-pointer items-center gap-3">
              <Avatar className="size-6 rounded-full">
                {logout.isPending ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : user ? (
                  <AvatarImage
                    src={
                      user?.image?.secureUrl
                        ? user.image.secureUrl
                        : `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
                            `${user?.firstName} ${user?.lastName}` || "user",
                          )}`
                    }
                    alt={`${user?.firstName} ${user?.lastName}`}
                  />
                ) : null}
              </Avatar>
              <div className="hidden md:flex md:flex-col md:items-start">
                <span className="font-lato text-sm font-semibold">
                  {user?.firstName || "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {contextLabel}
                </span>
              </div>
              {logout.isPending ? (
                <Loader2 className="ml-auto hidden text-muted-foreground md:block size-4 animate-spin text-primary" />
              ) : (
                <ChevronDown className="ml-auto hidden size-4 text-muted-foreground md:block" />
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {activeContext?.effectiveRole === ENUM_ROLE.ADMIN && (
                <DropdownMenuItem onClick={() => router.push("/subscription")}>
                  <CreditCard className="mr-2 size-4" />
                  <span>Subscription</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Pencil className="mr-2 size-4" />
                <span>Profile</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <Logout onLogout={handleLogout} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

"use client";

import { type LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { MenuItem } from "@/lib/utils/menu-utils";
import Link from "next/link";

export function NavMain({ items }: { items: MenuItem[] }) {
  const pathname = usePathname();

  const isMenuItemActive = (item: MenuItem) => {
    const matchUrls = item.matchUrls?.length ? item.matchUrls : [item.url];

    return matchUrls.some((url) => pathname === url || pathname.startsWith(url + "/"));
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              asChild
              isActive={Boolean(item.isActive) && isMenuItemActive(item)}
              className={
                !item.isActive
                  ? "text-gray-400 pointer-events-none opacity-70"
                  : ""
              }
            >
              <Link
                prefetch
                href={item.url}
                aria-disabled={!item.isActive}
                target={item?.openInNewTab ? "_blank" : undefined}
                rel={item?.openInNewTab ? "noopener noreferrer" : undefined}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

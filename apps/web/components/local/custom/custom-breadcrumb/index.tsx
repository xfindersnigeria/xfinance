"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ENUM_ROLE } from "@/lib/types/enums";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

interface CustomBreadcrumbProps {
  activeContext?: {
    realRole?: ENUM_ROLE;
    effectiveRole: ENUM_ROLE;
    isImpersonating: boolean;
    groupName?: string;
    entityName?: string;
  };
  loading?: boolean;
  role: ENUM_ROLE;
}

const toTitleCase = (s: string) => {
  if (!s) return "";
  return s
    .replace(/-/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function CustomBreadcrumb({
  role,
  activeContext,
  loading,
}: CustomBreadcrumbProps) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment);
  const visibleSegments = pathSegments.filter((s) => s.toLowerCase() !== "dashboard");

  const getRootItem = () => {
    if (loading) {
      return <Skeleton className="h-5 w-28" />;
    }
    switch (activeContext?.effectiveRole ?? role) {
      case ENUM_ROLE.SUPERADMIN:
        return "SuperAdmin";
      case ENUM_ROLE.ADMIN:
        return activeContext?.groupName || "Group";
      case ENUM_ROLE.USER:
        return activeContext?.entityName || activeContext?.groupName || "Entity";
      default:
        return "Dashboard";
    }
  };

  const rootItem = getRootItem();

  return (
    <div className="w-full">
      <Breadcrumb>
        <BreadcrumbList className="flex items-center overflow-hidden whitespace-nowrap">
          <BreadcrumbItem>
            {loading ? (
              rootItem
            ) : (
              <BreadcrumbLink asChild>
                <Link href="/dashboard">
                  <span className="inline-block max-w-30 sm:max-w-60 truncate">{rootItem}</span>
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>

          {visibleSegments.length > 1 && (
            <>
              <BreadcrumbSeparator className="sm:hidden">
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </BreadcrumbSeparator>
              <BreadcrumbItem className="sm:hidden">
                <BreadcrumbPage className="font-semibold text-gray-800">...</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}

          {visibleSegments.map((segment, idx) => {
            const index = pathSegments.findIndex((s) => s === segment);
            const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
            const isLast = idx === visibleSegments.length - 1;

            const itemClass = !isLast ? "hidden sm:block" : "";

            return (
              <React.Fragment key={href}>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </BreadcrumbSeparator>
                <BreadcrumbItem className={itemClass}>
                  {isLast ? (
                    <BreadcrumbPage className="font-semibold text-gray-800 truncate max-w-35">{toTitleCase(segment)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={href}>
                        <span className="inline-block max-w-30 truncate">{toTitleCase(segment)}</span>
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      {/* <h1 className="text-base mt-1">
        {pathSegments.length > 1 && pathSegments[0].toLowerCase() === 'dashboard'
          ? capitalize(pathSegments[pathSegments.length - 1])
          : pathSegments.length > 0 && pathSegments[0].toLowerCase() !== 'dashboard'
          ? capitalize(pathSegments[pathSegments.length - 1])
          : "Dashboard"}
      </h1> */}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import {
  Home,
  ShoppingCart,
  Briefcase,
  Package,
  Building,
  BookCopy,
  Landmark,
  Users,
  AreaChart,
  FolderKanban,
  FilePieChart,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useModulesByScope } from "@/lib/api/hooks/useModules";
import { useToggleEntityModule } from "@/lib/api/hooks/useSettings";
import type { Module } from "@/lib/api/services/moduleService";

const moduleIconMap: Record<string, LucideIcon> = {
  dashboard: Home,
  sales: ShoppingCart,
  purchases: Briefcase,
  products: Package,
  assets: Building,
  accounts: BookCopy,
  banking: Landmark,
  hr_payroll: Users,
  reports: AreaChart,
  projects: FolderKanban,
  budget: FilePieChart,
};

function ModuleIcon({ moduleKey }: { moduleKey: string }) {
  const Icon = moduleIconMap[moduleKey] ?? Package;
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 flex-shrink-0">
      <Icon className="w-4 h-4 text-primary" />
    </div>
  );
}

function ModuleItemSkeleton() {
  return (
    <div className="flex items-center justify-between py-5">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <Skeleton className="h-5 w-10 rounded-full" />
    </div>
  );
}

interface MenuGroupProps {
  menu: string;
  modules: Module[];
  localStates: Record<string, boolean>;
  onToggle: (menuName: string, enabled: boolean) => void;
  isUpdating: boolean;
}

function MenuGroup({ menu, modules, localStates, onToggle, isUpdating }: MenuGroupProps) {
  const allEnabled = modules.every(m => localStates[m.id] ?? true);

  const handleMenuToggle = (checked: boolean) => {
    onToggle(menu, checked);
  };

  const descriptionMap: Record<string, string> = {
    "Projects": "Track and manage client projects with budgets, milestones, and team collaboration",
    "Products": "Manage store items, inventory, POS, and online store functionality",
    "Assets & Inventory": "Track fixed assets, depreciation, and inventory management",
    "HR & Payroll": "Manage employees, attendance, payroll processing, and leave management",
  };

  return (
    <div className="flex items-center justify-between py-6 border-b last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ModuleIcon moduleKey={modules[0]?.moduleKey || "hr_payroll"} />
        <div>
          <p className="font-semibold text-gray-900">{menu}</p>
          {descriptionMap[menu] && (
            <p className="text-xs text-gray-500 mt-0.5">{descriptionMap[menu]}</p>
          )}
        </div>
      </div>
      <Switch
        checked={allEnabled}
        onCheckedChange={handleMenuToggle}
        disabled={isUpdating}
      />
    </div>
  );
}

export default function ModulesSettings() {
  const { data: modules, isLoading } = useModulesByScope({
    scope: "ENTITY",
    optional: "True",
  });

  const toggleModule = useToggleEntityModule();

  const [localStates, setLocalStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (modules) {
      const initial: Record<string, boolean> = {};
      modules.forEach((m) => {
        initial[m.id] = m.isMenuVisible ?? true;
      });
      setLocalStates(initial);
    }
  }, [modules]);

  const handleToggle = (menuName: string, enabled: boolean) => {
    // Optimistically update all modules in this menu group
    const menuModules = modules?.filter((m) => m.menu === menuName) ?? [];
    setLocalStates((prev) => {
      const next = { ...prev };
      menuModules.forEach((m) => { next[m.id] = enabled; });
      return next;
    });
    toggleModule.mutate(
      { menuName, enabled },
      {
        onError: () => {
          // Revert on failure
          setLocalStates((prev) => {
            const next = { ...prev };
            menuModules.forEach((m) => { next[m.id] = !enabled; });
            return next;
          });
        },
      },
    );
  };

  const groupedModules = React.useMemo(() => {
    if (!modules) return {};
    return modules.reduce((acc, module) => {
      const key = module.menu || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(module);
      return acc;
    }, {} as Record<string, Module[]>);
  }, [modules]);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="mb-2">
        <h2 className="font-normal text-base">Module Management</h2>
        <p className="text-sm text-gray-500">
          Enable or disable optional modules for this entity
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <>
            <ModuleItemSkeleton />
            <ModuleItemSkeleton />
            <ModuleItemSkeleton />
            <ModuleItemSkeleton />
          </>
        ) : modules && modules.length > 0 ? (
          Object.entries(groupedModules).map(([menu, menuModules]) => (
            <MenuGroup
              key={menu}
              menu={menu}
              modules={menuModules}
              localStates={localStates}
              onToggle={handleToggle}
              isUpdating={toggleModule.isPending}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">
            No modules available
          </p>
        )}
      </div>

      <div className="mt-4 flex items-start gap-3 bg-primary/10 border border-blue-100 rounded-xl p-4">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-primary">Module Settings</p>
          <p className="text-xs text-primary/80 mt-0.5">
            Changes are saved automatically and take effect immediately.
            Disabling a module will hide its menu items from the sidebar.
          </p>
        </div>
      </div>
    </div>
  );
}
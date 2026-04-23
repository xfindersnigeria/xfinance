"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAllPermissions } from "@/lib/api/hooks/useRoles";

type RoleFormType = {
  name: string;
  description: string;
  isAdmin: boolean;
  permissionIds: string[];
};

interface RolesFormProps {
  role?: any;
  onSubmit: (data: {
    name: string;
    description: string;
    scope: "ADMIN" | "USER";
    permissionIds: string[];
  }) => void;
  isLoading?: boolean;
  onClose?: () => void;
}

export default function RolesForm({
  role,
  onSubmit,
  isLoading = false,
  onClose,
}: RolesFormProps) {
  const [step, setStep] = useState(0);

  console.log(role, "role")

  const form = useForm<RoleFormType>({
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      isAdmin: role?.scope === "ADMIN" || false,
      permissionIds: role?.permissions || [],
    },
  });

  const isAdmin = form.watch("isAdmin");
  const permissionIds = form.watch("permissionIds");
  // Fetch permissions filtered by scope:
  // - Entity scope (isAdmin=false): get 'user' scope permissions (ENTITY-level only)
  // - Admin scope (isAdmin=true): get 'admin' scope (all permissions)
  const { data: modules = [] } = useAllPermissions(isAdmin ? undefined : "user");

  // Handle permission action selection
  const handleActionToggle = (actionId: string, checked: string | boolean) => {
    const isChecked = checked === true || checked === "indeterminate";
    const currentIds = [...permissionIds];
    if (isChecked) {
      // Auto-check View permission when any other action is selected
      const isViewAction = modules
        .flatMap((m: any) => m.actions)
        .find((a: any) => a.id === actionId)?.actionName === "View";

      if (!isViewAction) {
        // Find View action for this module
        const module = modules.find((m: any) =>
          m.actions.some((a: any) => a.id === actionId)
        );
        const viewAction = module?.actions.find((a: any) => a.actionName === "View");
        if (viewAction && !currentIds.includes(viewAction.id)) {
          currentIds.push(viewAction.id);
        }
      }
      currentIds.push(actionId);
    } else {
      const index = currentIds.indexOf(actionId);
      if (index > -1) {
        currentIds.splice(index, 1);
      }
    }
    form.setValue("permissionIds", currentIds);
  };

  // Get count of selected permissions for a module
  const getModulePermissionCount = (moduleId: string): number => {
    const module = modules.find((m: any) => m.moduleId === moduleId);
    if (!module) return 0;
    return module.actions.filter((a: any) => permissionIds.includes(a.id)).length;
  };

  // Enable all permissions for a module
  const handleEnableAll = (moduleId: string) => {
    const module = modules.find((m: any) => m.moduleId === moduleId);
    if (!module) return;
    
    const currentIds = [...permissionIds];
    module.actions.forEach((action: any) => {
      if (!currentIds.includes(action.id)) {
        currentIds.push(action.id);
      }
    });
    form.setValue("permissionIds", currentIds);
  };

  // Get total selected permissions count
  const getTotalPermissions = (): number => {
    return permissionIds.length;
  };

  // Group modules by scope and menu
  const groupedModules = modules.reduce(
    (acc: any, module: any) => {
      const scope = module.scope === "GROUP" ? "ADMIN" : "USER";
      const menu = module.menu || "Other";

      if (!acc[scope]) acc[scope] = {};
      if (!acc[scope][menu]) acc[scope][menu] = [];
      acc[scope][menu].push(module);

      return acc;
    },
    {}
  );

  const validateStep = (): boolean => {
    if (step === 0) {
      const name = form.getValues("name");
      const desc = form.getValues("description");
      if (!name || !desc) {
        form.trigger(["name", "description"]);
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (validateStep()) {
      setStep(1);
    }
  };

  const handleSubmit = (data: RoleFormType) => {
    // Validate required fields
    if (!data.name || !data.description) {
      if (!data.name) form.setError("name", { message: "Role name is required" });
      if (!data.description) form.setError("description", { message: "Description is required" });
      return;
    }
    if (data.permissionIds.length === 0) {
      return; // This is also checked by button disable
    }
    
    // Format data for backend
    const scope: "ADMIN" | "USER" = data.isAdmin ? "ADMIN" : "USER";
    const formattedData = {
      name: data.name,
      description: data.description,
      scope,
      permissionIds: data.permissionIds,
    };
    onSubmit(formattedData);
  };

  const handleCancel = () => {
    onClose?.();
    setStep(0);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
        {/* Tab Navigation */}
        <Tabs value={String(step)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="0" disabled={step !== 0} className="cursor-pointer">
              Basic Information
            </TabsTrigger>
            <TabsTrigger value="1" disabled={step !== 1} className="cursor-pointer">
              Permissions
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Role Details */}
          <TabsContent value="0" className="space-y-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-900">Role Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Regional Finance Manager"
                          {...field}
                          className="border-gray-300 h-8 text-xs"
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Clear, descriptive name for this role
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-900">Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the responsibilities and access level..."
                          className="resize-none border-gray-300 text-xs"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Purpose and responsibilities of this role
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Role Scope Toggle */}
            <Card className="p-3 border-gray-200">
              <FormField
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <FormLabel className="text-xs font-semibold text-gray-900 cursor-pointer">
                        {field.value ? "Admin Scope" : "Entity Scope"}
                      </FormLabel>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {field.value 
                          ? "This role operates at the group level" 
                          : "This role operates at the entity level"}
                      </p>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </Card>

            {/* Role Summary */}
            <Card className="p-3 bg-indigo-50 border-indigo-200">
              <div className="flex gap-2">
                <div className="text-indigo-600 mt-0.5 text-lg">ℹ️</div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-gray-900">Role Configuration</p>
                  <p className="text-gray-700">
                    <span className="font-medium">Name:</span>
                    {form.getValues("name") ? ` ${form.getValues("name")}` : " Not set"}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Scope:</span>
                    {form.getValues("isAdmin") ? " Admin (Group-Level)" : " Entity (Entity-Level)"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                size="sm"
                className="flex-1 text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                size="sm"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs h-8"
              >
                Configure Permissions
              </Button>
            </div>
          </TabsContent>

          {/* Step 2: Permissions */}
          <TabsContent value="1" className="space-y-4">
            <Card className="p-3 bg-indigo-50 border-indigo-200">
              <div className="flex items-start gap-2">
                <div className="text-indigo-600 text-lg mt-0.5">ℹ️</div>
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-gray-900">
                    Configure granular permissions for each module
                  </p>
                  <div className="flex gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs h-5">
                        ✓ Enabled
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-xs h-5">
                        ✕ Disabled
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Grouped Permissions by Scope and Menu */}
            <div className="space-y-6">
              {/* Entity Scope Section */}
              {groupedModules["USER"] && (
                <div className="border-2 border-blue-300 rounded-lg bg-blue-50 overflow-hidden">
                  {/* Entity Scope Header */}
                  <div className="p-2 bg-blue-200 font-bold text-base text-gray-900 flex items-center gap-2">
                    <span>🏢</span> Entity Scope
                  </div>

                  {/* Menus within Entity Scope */}
                  <Accordion type="single" collapsible className="w-full">
                    <div className="space-y-2 p-3">
                      {Object.entries(groupedModules["USER"]).map(([menu, modulesList]: any) => (
                        <Accordion
                          key={menu}
                          type="single"
                          collapsible
                          className="w-full"
                        >
                          {/* Menu Accordion - Distinctive Styling */}
                          <AccordionItem value={`USER-${menu}`} className="border-2 border-gray-300 rounded-md bg-gray-100">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-200 transition-colors">
                              <div className="flex items-center gap-2 text-left">
                                <span className="text-sm font-bold text-gray-900">📁 {menu}</span>
                              </div>
                            </AccordionTrigger>

                            <AccordionContent className="space-y-1 pb-2 pt-2 bg-white border-t-2 border-gray-200">
                              {/* Modules within Menu */}
                              {(modulesList as any[]).map((module: any) => (
                                <Accordion
                                  key={module.moduleId}
                                  type="single"
                                  collapsible
                                  className="w-full"
                                >
                                  {/* Module Accordion - Nested Style */}
                                  <AccordionItem
                                    value={module.moduleId}
                                    className="border border-gray-200 rounded bg-gray-50 ml-2"
                                  >
                                    <AccordionTrigger className="hover:no-underline hover:bg-gray-100 transition-colors px-3 py-2">
                                      <div className="flex items-center justify-between flex-1 gap-2">
                                        <div className="flex-1 text-left">
                                          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                            <span>📋</span> {module.moduleName}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                                            {getModulePermissionCount(module.moduleId)} /
                                            {module.actions.length}
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEnableAll(module.moduleId);
                                            }}
                                            className="h-5 px-1.5 text-xs text-indigo-600 hover:bg-indigo-50"
                                          >
                                            All
                                          </Button>
                                        </div>
                                      </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="pb-3 pt-2 bg-gray-50 border-t border-gray-200 rounded-b">
                                      <div className="grid grid-cols-4 gap-2 px-2">
                                        {module.actions.map((action: any) => {
                                          const isChecked = permissionIds.includes(action.id);
                                          return (
                                            <div
                                              key={action.id}
                                              className={`flex items-center gap-1.5 p-2.5 rounded border transition-all cursor-pointer ${
                                                isChecked
                                                  ? "bg-green-100 border-green-400 shadow-sm"
                                                  : "bg-white border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                                              }`}
                                            >
                                              <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={(checked) =>
                                                  handleActionToggle(action.id, checked)
                                                }
                                                className="h-4 w-4 shrink-0"
                                                id={action.id}
                                              />
                                              <label
                                                htmlFor={action.id}
                                                className="text-xs font-medium text-gray-900 cursor-pointer flex-1 min-w-0"
                                              >
                                                {action.actionName}
                                              </label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                    </div>
                  </Accordion>
                </div>
              )}

              {/* Admin Scope Section */}
              {groupedModules["ADMIN"] && (
                <div className="border-2 border-purple-300 rounded-lg bg-purple-50 overflow-hidden">
                  {/* Admin Scope Header */}
                  <div className="p-2 bg-purple-200 font-bold text-base text-gray-900 flex items-center gap-2">
                    <span>👨‍💼</span> Admin Scope
                  </div>

                  {/* Menus within Admin Scope */}
                  <Accordion type="single" collapsible className="w-full">
                    <div className="space-y-2 p-3">
                      {Object.entries(groupedModules["ADMIN"]).map(([menu, modulesList]: any) => (
                        <Accordion
                          key={menu}
                          type="single"
                          collapsible
                          className="w-full"
                        >
                          {/* Menu Accordion - Distinctive Styling */}
                          <AccordionItem value={`ADMIN-${menu}`} className="border-2 border-gray-300 rounded-md bg-gray-100">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-200 transition-colors">
                              <div className="flex items-center gap-2 text-left">
                                <span className="text-sm font-bold text-gray-900">📁 {menu}</span>
                              </div>
                            </AccordionTrigger>

                            <AccordionContent className="space-y-1 pb-2 pt-2 bg-white border-t-2 border-gray-200">
                              {/* Modules within Menu */}
                              {(modulesList as any[]).map((module: any) => (
                                <Accordion
                                  key={module.moduleId}
                                  type="single"
                                  collapsible
                                  className="w-full"
                                >
                                  {/* Module Accordion - Nested Style */}
                                  <AccordionItem
                                    value={module.moduleId}
                                    className="border border-gray-200 rounded bg-gray-50 ml-2"
                                  >
                                    <AccordionTrigger className="hover:no-underline hover:bg-gray-100 transition-colors px-3 py-2">
                                      <div className="flex items-center justify-between flex-1 gap-2">
                                        <div className="flex-1 text-left">
                                          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                            <span>📋</span> {module.moduleName}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                                            {getModulePermissionCount(module.moduleId)} /
                                            {module.actions.length}
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEnableAll(module.moduleId);
                                            }}
                                            className="h-5 px-1.5 text-xs text-indigo-600 hover:bg-indigo-50"
                                          >
                                            All
                                          </Button>
                                        </div>
                                      </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="pb-3 pt-2 bg-gray-50 border-t border-gray-200 rounded-b">
                                      <div className="grid grid-cols-4 gap-2 px-2">
                                        {module.actions.map((action: any) => {
                                          const isChecked = permissionIds.includes(action.id);
                                          return (
                                            <div
                                              key={action.id}
                                              className={`flex items-center gap-1.5 p-2.5 rounded border transition-all cursor-pointer ${
                                                isChecked
                                                  ? "bg-green-100 border-green-400 shadow-sm"
                                                  : "bg-white border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                                              }`}
                                            >
                                              <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={(checked) =>
                                                  handleActionToggle(action.id, checked)
                                                }
                                                className="h-4 w-4 shrink-0"
                                                id={action.id}
                                              />
                                              <label
                                                htmlFor={action.id}
                                                className="text-xs font-medium text-gray-900 cursor-pointer flex-1 min-w-0"
                                              >
                                                {action.actionName}
                                              </label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                    </div>
                  </Accordion>
                </div>
              )}
            </div>

            {/* Permissions Summary */}
            {getTotalPermissions() > 0 && (
              <Card className="p-3 bg-green-50 border-green-200 mt-3">
                <p className="text-xs text-green-700 font-medium">
                  ✓ <span className="font-semibold">{getTotalPermissions()} actions</span> selected across{" "}
                  {modules.length} modules
                </p>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(0)}
                size="sm"
                className="flex-1 text-xs h-8"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || getTotalPermissions() === 0}
                size="sm"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs h-8"
              >
                {isLoading ? "Creating..." : role ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}

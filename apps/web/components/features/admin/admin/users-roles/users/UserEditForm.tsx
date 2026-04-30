"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser, useUpdateUser } from "@/lib/api/hooks/useUsers";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useEntities } from "@/lib/api/hooks/useEntity";

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  department: z.string().optional(),
  systemRole: z.enum(["admin", "user"]),
  roleId: z.string().min(1, "Role is required"),
  entityId: z.string().optional(),
  adminEntities: z.array(z.string()),
  isActive: z.boolean(),
});

type EditFormData = z.infer<typeof editSchema>;

interface UserEditFormProps {
  userId: string;
}

export default function UserEditForm({ userId }: UserEditFormProps) {
  const { data: user, isLoading } = useUser(userId);
  const { mutateAsync: updateUser, isPending } = useUpdateUser();
  const { data: rolesData } = useRoles({});
  const { data: entitiesData } = useEntities();

  const roles: any[] = (rolesData as any)?.data || [];
  const entities: any[] = (entitiesData as any)?.entities || [];

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      department: "",
      systemRole: "user",
      roleId: "",
      entityId: "",
      adminEntities: [],
      isActive: true,
    },
  });

  const watchedSystemRole = form.watch("systemRole");

  // Prefill form once user data is loaded
  useEffect(() => {
    if (!user) return;
    const u = user as any;
    form.reset({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      department: u.department || "",
      systemRole: u.systemRole === "admin" ? "admin" : "user",
      roleId: u.roleId || "",
      entityId: u.entityId || "",
      adminEntities: u.adminEntities || [],
      isActive: u.isActive ?? true,
    });
  }, [user]);

  const filteredRoles = roles.filter((r: any) =>
    watchedSystemRole === "admin" ? r.scope === "ADMIN" : r.scope === "USER",
  );

  const handleAdminEntityToggle = (entityId: string, checked: boolean) => {
    const current = form.getValues("adminEntities");
    if (checked) {
      form.setValue("adminEntities", [...current, entityId]);
    } else {
      form.setValue("adminEntities", current.filter((id) => id !== entityId));
    }
  };

  const onSubmit = async (values: EditFormData) => {
    const payload: any = {
      firstName: values.firstName,
      lastName: values.lastName,
      department: values.department || undefined,
      roleId: values.roleId,
      isActive: values.isActive,
      systemRole: values.systemRole,
    };

    if (values.systemRole === "admin") {
      payload.adminEntities = values.adminEntities;
    } else {
      payload.entityId = values.entityId || undefined;
    }

    await updateUser({ userId, payload });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Loading user details...
      </div>
    );
  }

  const u = user as any;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic info */}
        <div className="rounded-lg bg-indigo-50/60 border border-indigo-200 p-4 space-y-4">
          <p className="font-semibold text-primary text-sm flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> Basic Information
          </p>
          <div className="text-xs text-muted-foreground mb-1">
            {u?.email}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="First name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Department (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* System role + scope */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-4">
          <p className="font-semibold text-blue-900 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" /> Role & Access
          </p>

          <FormField
            control={form.control}
            name="systemRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Role *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    // Reset dependent fields when role changes
                    form.setValue("roleId", "");
                    form.setValue("entityId", "");
                    form.setValue("adminEntities", []);
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select system role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Admin (group-scoped)</SelectItem>
                    <SelectItem value="user">User (entity-scoped)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Role *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredRoles.map((role: any) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Entity select for user-scoped */}
          {watchedSystemRole === "user" && (
            <FormField
              control={form.control}
              name="entityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entities.map((entity: any) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Entity checkboxes for admin-scoped */}
          {watchedSystemRole === "admin" && (
            <div>
              <FormLabel className="block mb-2">
                Entity Access{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  (leave all unchecked for full group access)
                </span>
              </FormLabel>
              {entities.length === 0 ? (
                <p className="text-xs text-muted-foreground">No entities found</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {entities.map((entity: any) => {
                    const checked = form.watch("adminEntities").includes(entity.id);
                    return (
                      <div key={entity.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`entity-${entity.id}`}
                          checked={checked}
                          onCheckedChange={(val) =>
                            handleAdminEntityToggle(entity.id, !!val)
                          }
                        />
                        <label
                          htmlFor={`entity-${entity.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {entity.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {form.watch("adminEntities").length === 0
                  ? "Full access to all entities"
                  : `Restricted to ${form.watch("adminEntities").length} selected entity(ies)`}
              </p>
            </div>
          )}
        </div>

        {/* Status */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg border border-gray-200 bg-white">
              <div>
                <FormLabel className="font-medium">Active Status</FormLabel>
                <div className="text-xs text-muted-foreground">
                  Inactive users cannot log in
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-primary text-white"
          >
            {isPending && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

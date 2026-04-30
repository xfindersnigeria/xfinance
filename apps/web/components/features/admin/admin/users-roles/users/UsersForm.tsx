"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { userFormSchema, UserFormSchema } from "../utils/schema";
import { User } from "../utils/types";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useEntities } from "@/lib/api/hooks/useEntity";
import { useState } from "react";
import { useCreateUser } from "@/lib/api/hooks/useUsers";
import { Loader2 } from "lucide-react";

interface UsersFormProps {
  user?: User;
  onSubmit?: (payload: any) => void;
  isPending?: boolean;
  onClose?: () => void;
}

const STATUS_OPTIONS = ["Active", "Inactive", "Pending"] as const;

export default function UsersForm({
  user,
  // onSubmit,
  // isPending = false,
  onClose,
}: UsersFormProps) {
  const [tab, setTab] = useState("single");
  const [scope, setScope] = useState("GROUP");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [roleSearch, setRoleSearch] = useState("");

  // Fetch roles filtered by scope
  const { data: roles = [] } = useRoles({ search: roleSearch });
  // Fetch entities for entity select
  const { data: entities = [] } = useEntities();

  console.log(roles, entities, "data");

  // Filter roles by scope
  const filteredRoles = (roles as any).data
    ? (roles as any).data.filter((r: any) =>
        scope === "GROUP" ? r.scope === "ADMIN" : r.scope === "USER",
      )
    : [];

  // Form for single user
  const singleForm = useForm({
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      department: "",
      roleId: "",
      requirePasswordChange: false,
      sendWelcomeEmail: true,
      customMessage: "",
    },
  });

  // Form for bulk users
  const bulkForm = useForm({
    defaultValues: {
      emails: "",
      roleId: "",
      requirePasswordChange: false,
      sendWelcomeEmail: true,
      entity: "",
    },
  });

  // Use create user mutation
  const { mutateAsync: createUser, isPending } = useCreateUser();

  // Handle submit for single user
  const handleSingleSubmit = async (data: any) => {
    const payload = {
      ...data,
      scope,

      entityId: scope === "ENTITY" ? selectedEntity || undefined : undefined,
    };
    await createUser(payload);
    // onSubmit && onSubmit(payload);
  };

  // Handle submit for bulk users
  const handleBulkSubmit = async (data: any) => {
    const payload = {
      ...data,
      scope,
      entityId: scope === "ENTITY" ? selectedEntity || undefined : undefined,
    };
    await createUser(payload);
    // onSubmit && onSubmit(payload);
  };

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="single">Single User</TabsTrigger>
          <TabsTrigger value="bulk">Multiple Users</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Single User Tab */}
      {tab === "single" && (
        <Form {...singleForm}>
          <form
            onSubmit={singleForm.handleSubmit(handleSingleSubmit)}
            className="space-y-4"
          >
            <div className="flex items-center md:flex-row flex-col gap-5">
              <FormField
                control={singleForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={singleForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="w-full">
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
              control={singleForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scope select (single) */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1">Scope</label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROUP">Group</SelectItem>
                  <SelectItem value="ENTITY">Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Entity select if scope is ENTITY (single) */}
            {scope === "ENTITY" && (
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1">
                  Entity
                </label>
                <Select
                  value={selectedEntity}
                  onValueChange={setSelectedEntity}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select entity (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(entities as any).entities &&
                      (entities as any).entities.map((entity: any) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center md:flex-row flex-col gap-5">
              <FormField
                control={singleForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Role *</FormLabel>
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
              <FormField
                control={singleForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Department (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Section: Invitation Settings */}
            <div className="rounded-lg bg-indigo-50/60 border border-indigo-200 p-4 mb-2 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="text-indigo-500"
                >
                  <path
                    fill="currentColor"
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-2c0-2.66-5.33-4-8-4Z"
                  />
                </svg>
                <span className="font-semibold text-primary">
                  Invitation Settings
                </span>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={singleForm.control}
                  name="requirePasswordChange"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between w-full p-2 bg-white rounded-md border border-indigo-100">
                      <div>
                        <FormLabel className="font-medium">
                          Require Password Change
                        </FormLabel>
                        <div className="text-xs text-muted-foreground">
                          User must change password on first login
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
                <FormField
                  control={singleForm.control}
                  name="sendWelcomeEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between w-full p-2 bg-white rounded-md border border-indigo-100">
                      <div>
                        <FormLabel className="font-medium">
                          Send Welcome Email
                        </FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Send invitation email to user
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
              </div>
            </div>
            <FormField
              control={singleForm.control}
              name="customMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Message (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message to the invitation email..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-indigo-600 text-white"
              >
                {" "}
                {isPending && <Loader2 className="animate-spin mr-2" />}
                {isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Bulk Users Tab */}
      {tab === "bulk" && (
        <Form {...bulkForm}>
          <form
            onSubmit={bulkForm.handleSubmit(handleBulkSubmit)}
            className="space-y-4"
          >
            <FormField
              control={bulkForm.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Addresses *</FormLabel>
                  <FormControl>
                    {/* <Input
                      placeholder="Enter emails separated by commas"
                      {...field}
                    /> */}

                    <Textarea
                      placeholder="Enter emails separated by commas"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Scope select (bulk) */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1">Scope</label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROUP">Group</SelectItem>
                  <SelectItem value="ENTITY">Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Entity select if scope is ENTITY (bulk) */}
            {scope === "ENTITY" && (
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1">
                  Entity
                </label>
                <Select
                  value={selectedEntity}
                  onValueChange={setSelectedEntity}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select entity (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(entities as any).entities &&
                      (entities as any).entities.map((entity: any) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <FormField
              control={bulkForm.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Role *</FormLabel>
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
            {/* Section: Invitation Settings (Bulk) */}
            <div className="rounded-lg bg-indigo-50/60 border border-indigo-200 p-4 mb-2 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="text-indigo-500"
                >
                  <path
                    fill="currentColor"
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-2c0-2.66-5.33-4-8-4Z"
                  />
                </svg>
                <span className="font-semibold text-primary">
                  Invitation Settings
                </span>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={bulkForm.control}
                  name="requirePasswordChange"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between w-full p-2 bg-white rounded-md border border-indigo-100">
                      <div>
                        <FormLabel className="font-medium">
                          Require Password Change
                        </FormLabel>
                        <div className="text-xs text-muted-foreground">
                          User must change password on first login
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
                <FormField
                  control={bulkForm.control}
                  name="sendWelcomeEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between w-full p-2 bg-white rounded-md border border-indigo-100">
                      <div>
                        <FormLabel className="font-medium">
                          Send Welcome Email
                        </FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Send invitation email to user
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
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-indigo-600 text-white"
              >
                {isPending && <Loader2 className="animate-spin mr-2" />}
                {isPending ? "Sending..." : "Send Invitations"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

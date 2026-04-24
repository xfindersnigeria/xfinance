"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
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
import { ArrowRight, Loader2 } from "lucide-react";
import { projectFormSchema, ProjectFormInputs } from "./utils/schema";
import { projectStatuses } from "./utils/data";
import { useCustomers } from "@/lib/api/hooks/useSales";
import { useEmployees } from "@/lib/api/hooks/useHR";
import {
  useCreateProject,
  useUpdateProject,
} from "@/lib/api/hooks/useProjects";
import { start } from "repl";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ProjectsFormProps {
  project?: Partial<ProjectFormInputs> & { id?: string };
  isEditMode?: boolean;
}

/**
 * Form component for creating/editing projects
 * Handles project details, timeline, budget, and team assignment
 * Integrates with modal provider for state management
 */
export default function ProjectsForm({
  project,
  isEditMode = false,
}: ProjectsFormProps) {
  const { closeModal } = useModal();
  const sym = useEntityCurrencySymbol();
  const { data: customersData } = useCustomers({ limit: 1000 });
  const customers = (customersData as any)?.customers || [];
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const { data: employeesData } = useEmployees({ limit: 1000 });
  const managers = (employeesData as any)?.employees || [];
  const form = useForm<ProjectFormInputs>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      // code: project?.code || "",
      name: project?.name || "",
      description: project?.description || "",
      customerId: project?.customerId || "",
      status: (project?.status as any) || "Planning",
      startDate: project?.startDate || "",
      endDate: project?.endDate || "",
      budgetedRevenue: project?.budgetedRevenue || 0,
      budgetedCost: project?.budgetedCost || 0,
      managerId: project?.managerId || "",
      billingType: project?.billingType || "Fixed Price",
      currency: project?.currency || "USD",
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        // code: project.code || "",
        name: project.name || "",
        description: project.description || "",
        customerId: project.customerId || "",
        status: (project.status as any) || "Planning",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
        budgetedRevenue: project.budgetedRevenue || 0,
        budgetedCost: project.budgetedCost || 0,
        managerId: project.managerId || "",
        currency: project.currency || "USD",
        billingType: project.billingType || "Fixed Price",
      });
    }
  }, [project]);

  const onSubmit = async (values: ProjectFormInputs) => {
    try {
      const payload = {
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
      };
      if (isEditMode && project?.id) {
        await updateProject.mutateAsync({ id: project.id, data: payload });
      } else {
        await createProject.mutateAsync(payload);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          {/* Project Information Section */}
          <div className="mb-8 bg-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📄</span>
              <h2 className="font-semibold text-lg">Project Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Website Redesign"
                        {...field}
                        className="rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Customer */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((cust: any) => (
                            <SelectItem key={cust.id} value={cust.id}>
                              {cust.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Project scope and objectives"
                      {...field}
                      className="rounded-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Timeline & Schedule Section */}
          <div className="mb-8 bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📅</span>
              <h2 className="font-semibold text-lg">Timeline & Schedule</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Expected End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Financial Details Section */}
          <div className="mb-8 bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💲</span>
              <h2 className="font-semibold text-lg">Financial Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billing Type */}
              <FormField
                control={form.control}
                name="billingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select billing type" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Fixed Price", "Time & Materials", "Cost Plus"].map(
                            (type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {["USD", "EUR", "GBP", "NGN"].map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Budgeted Revenue */}
              <FormField
                control={form.control}
                name="budgetedRevenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{`Budgeted Revenue (${sym})`}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                        className="rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Budgeted Cost */}
              <FormField
                control={form.control}
                name="budgetedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{`Budgeted Cost (${sym})`}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                        className="rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Team & Management Section */}
          <div className="mb-8 bg-yellow-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">👥</span>
              <h2 className="font-semibold text-lg">Team & Management</h2>
            </div>
            {/* Project Manager */}
            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Manager</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((mgr: any) => (
                          <SelectItem key={mgr.id} value={mgr.id}>
                            {mgr.firstName} {mgr.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-4 bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-blue-700">
                <span className="text-lg">ℹ️</span>
                <span className="font-semibold">Project Management Tips</span>
              </div>
              <ul className="text-sm text-blue-700 list-disc pl-6">
                <li>
                  Track all project income and expenses in dedicated categories
                </li>
                <li>
                  Monitor profitability with real-time cost vs revenue analysis
                </li>
                <li>Set milestones to track progress and billing schedules</li>
                <li>
                  Assign team members to log time and expenses against the
                  project
                </li>
              </ul>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg flex-1"
              onClick={() =>
                closeModal(
                  isEditMode
                    ? MODAL.PROJECT_EDIT + "-" + project?.id
                    : MODAL.PROJECT_CREATE,
                )
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-lg flex-1 gap-2"
              disabled={createProject.isPending || updateProject.isPending}
            >
              {createProject.isPending || updateProject.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isEditMode ? "Update Project" : "Create Project"}{" "}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

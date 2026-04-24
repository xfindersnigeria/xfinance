"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Flag, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useCreateMilestone, useUpdateMilestone } from "@/lib/api/hooks/useProjects";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

const MILESTONE_STATUSES = [
  { value: "Upcoming", label: "Upcoming" },
  { value: "In_Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "On_Hold", label: "On Hold" },
];

const schema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().optional(),
  dueDate: z.date(),
  status: z.string().min(1, "Status is required"),
  budget: z.number().min(0.01, "Budget must be greater than 0"),
});

type FormData = z.infer<typeof schema>;

interface ProjectMilestoneFormProps {
  projectId: string;
  projectName?: string;
  milestone?: Partial<Omit<FormData, "dueDate"> & { dueDate?: string | Date; id?: string }>;
  isEditMode?: boolean;
}

export default function ProjectMilestoneForm({
  projectId,
  projectName,
  milestone,
  isEditMode = false,
}: ProjectMilestoneFormProps) {
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const { closeModal } = useModal();
  const sym = useEntityCurrencySymbol();

  const isPending = createMilestone.isPending || updateMilestone.isPending;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: milestone?.name ?? "",
      description: milestone?.description ?? "",
      dueDate: milestone?.dueDate ? new Date(milestone.dueDate) : new Date(),
      status: milestone?.status ?? "Upcoming",
      budget: milestone?.budget ?? 0,
    },
  });

  const onSubmit = async (values: FormData) => {
    const payload = {
      ...values,
      dueDate: values.dueDate.toISOString(),
    };
    if (isEditMode && milestone?.id) {
      await updateMilestone.mutateAsync({ id: milestone.id, data: payload, projectId });
    } else {
      await createMilestone.mutateAsync({ ...payload, projectId });
    }
  };

  const handleCancel = () => {
    closeModal(isEditMode ? MODAL.PROJECT_MILESTONE_EDIT : MODAL.PROJECT_MILESTONE_ADD);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Milestone Information */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4" /> Milestone Information
            </h4>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Phase 1 Complete, Testing Complete"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Milestone description or deliverables..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Timeline & Status */}
          <div className="p-4 bg-green-50 rounded-xl">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Timeline & Status
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {MILESTONE_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
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
          </div>

          {/* Budget */}
          <div className="p-4 bg-purple-50 rounded-xl">
            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Budget
            </h4>
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`Milestone Budget (${sym}) *`}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="0.00"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-1 pb-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Please wait..."
                : isEditMode
                  ? "Update Milestone"
                  : "Add Milestone"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

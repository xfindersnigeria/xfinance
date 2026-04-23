"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { User, Briefcase, DollarSign } from "lucide-react";
import { useAddProjectTeamMember, useUpdateProjectTeamMember } from "@/lib/api/hooks/useProjects";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

const ROLE_OPTIONS = [
  "Project Manager",
  "Lead Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "UI/UX Designer",
  "QA Engineer",
  "DevOps Engineer",
  "Business Analyst",
  "Data Analyst",
  "Scrum Master",
  "Technical Lead",
];

const schema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  role: z.string().min(1, "Role is required"),
  monthlyRate: z.number().min(1, "Monthly rate must be greater than 0"),
  estimatedMonths: z.number().int().min(1, "Estimated months must be at least 1"),
});

type FormData = z.infer<typeof schema>;

interface ProjectTeamMemberFormProps {
  projectId: string;
  projectName?: string;
  member?: Partial<FormData> & { id?: string };
  isEditMode?: boolean;
}

export default function ProjectTeamMemberForm({
  projectId,
  projectName,
  member,
  isEditMode = false,
}: ProjectTeamMemberFormProps) {
  const addMember = useAddProjectTeamMember();
  const updateMember = useUpdateProjectTeamMember();
  const { closeModal } = useModal();

  const isPending = addMember.isPending || updateMember.isPending;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: member?.name ?? "",
      email: member?.email ?? "",
      role: member?.role ?? "",
      monthlyRate: member?.monthlyRate ?? 0,
      estimatedMonths: member?.estimatedMonths ?? 1,
    },
  });

  const onSubmit = async (values: FormData) => {
    if (isEditMode && member?.id) {
      await updateMember.mutateAsync({ id: member.id, data: values, projectId });
    } else {
      await addMember.mutateAsync({ ...values, projectId });
    }
  };

  const handleCancel = () => {
    closeModal(isEditMode ? MODAL.PROJECT_TEAM_MEMBER_EDIT : MODAL.PROJECT_TEAM_MEMBER_ADD);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Personal Information */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Personal Information
            </h4>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Role & Assignment */}
          <div className="p-4 bg-green-50 rounded-xl">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Role & Assignment
            </h4>
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role/Position *</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
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

          {/* Cost & Duration */}
          <div className="p-4 bg-purple-50 rounded-xl">
            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Cost & Duration
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Rate (₦) *</FormLabel>
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
              <FormField
                control={form.control}
                name="estimatedMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Months *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="0"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-1 pb-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Please wait..."
                : isEditMode
                  ? "Update Team Member"
                  : "Add Team Member"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

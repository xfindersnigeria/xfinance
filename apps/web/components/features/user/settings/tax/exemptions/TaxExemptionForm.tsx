"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useCreateTaxExemption, useUpdateTaxExemption } from "@/lib/api/hooks/useTax";
import type { TaxExemption } from "@/lib/api/services/taxService";

const schema = z.object({
  name: z.string().trim().min(1, "Exemption name is required"),
  code: z.string().trim().min(1, "Code is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function TaxExemptionForm({ exemption, onSuccess }: { exemption?: TaxExemption; onSuccess?: () => void }) {
  const isEdit = !!exemption;
  const create = useCreateTaxExemption();
  const update = useUpdateTaxExemption();
  const isPending = create.isPending || update.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: exemption?.name ?? "",
      code: exemption?.code ?? "",
      description: exemption?.description ?? "",
      isActive: exemption?.isActive ?? true,
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      description: values.description?.trim() ?? "",
      isActive: values.isActive,
    };
    if (isEdit) update.mutate({ id: exemption.id, payload }, { onSuccess });
    else create.mutate(payload, { onSuccess });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exemption Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Basic Food Items" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. FOOD-001"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription className="text-xs">Must be unique — shown on documents that use it</FormDescription>
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
                <Textarea placeholder="What this exemption covers" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <div>
                <FormLabel className="mb-0.5">Active</FormLabel>
                <FormDescription className="text-xs">Inactive exemptions can&apos;t be picked on new documents</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : (
            "Save Exemption"
          )}
        </Button>
      </form>
    </Form>
  );
}

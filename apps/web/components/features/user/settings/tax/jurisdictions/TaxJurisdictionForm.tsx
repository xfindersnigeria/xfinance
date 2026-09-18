"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Globe, Loader2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useCreateTaxJurisdiction, useUpdateTaxJurisdiction } from "@/lib/api/hooks/useTax";
import type { TaxJurisdiction, TaxJurisdictionPayload } from "@/lib/api/services/taxService";
import { flagEmoji } from "../shared";

const schema = z.object({
  name: z.string().trim().min(1, "Jurisdiction name is required"),
  description: z.string().optional(),
  countryCode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Za-z]{2}$/.test(v), "Use a 2-letter country code, e.g. NG"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function TaxJurisdictionForm({
  jurisdiction,
  onSuccess,
}: {
  jurisdiction?: TaxJurisdiction;
  onSuccess?: () => void;
}) {
  const isEdit = !!jurisdiction;
  const create = useCreateTaxJurisdiction();
  const update = useUpdateTaxJurisdiction();
  const isPending = create.isPending || update.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: jurisdiction?.name ?? "",
      description: jurisdiction?.description ?? "",
      countryCode: jurisdiction?.countryCode ?? "",
      isActive: jurisdiction?.isActive ?? true,
    },
  });

  const flag = flagEmoji(form.watch("countryCode"));

  const onSubmit = (values: FormValues) => {
    const payload: TaxJurisdictionPayload = {
      name: values.name.trim(),
      description: values.description?.trim() ?? "",
      isActive: values.isActive,
    };
    // The API only accepts exactly 2 letters, so a blank code is left out (it can't be cleared)
    if (values.countryCode) payload.countryCode = values.countryCode.toUpperCase();
    if (isEdit) update.mutate({ id: jurisdiction.id, payload }, { onSuccess });
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
              <FormLabel>Jurisdiction Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Nigeria, Lagos State" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="countryCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country Code</FormLabel>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-xl shrink-0">
                  {flag ?? <Globe className="w-4 h-4 text-primary" />}
                </div>
                <FormControl>
                  <Input
                    placeholder="e.g. NG"
                    maxLength={2}
                    className="max-w-[120px]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-xs">Optional 2-letter ISO code — used to show the flag</FormDescription>
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
                <Textarea placeholder="e.g. Federal VAT system" rows={3} {...field} />
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
                <FormDescription className="text-xs">Mark jurisdictions you no longer trade in as inactive</FormDescription>
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
            "Save Jurisdiction"
          )}
        </Button>
      </form>
    </Form>
  );
}

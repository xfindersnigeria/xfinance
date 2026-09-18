"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTaxRate, useUpdateTaxRate } from "@/lib/api/hooks/useTax";
import type { TaxJurisdiction, TaxRate, TaxRatePayload, TaxRateType } from "@/lib/api/services/taxService";

export const TAX_RATE_TYPES: TaxRateType[] = ["VAT", "Sales Tax", "Withholding Tax", "Other"];
const NO_JURISDICTION = "__none";

const schema = z.object({
  name: z.string().trim().min(1, "Tax name is required"),
  type: z.enum(["VAT", "Sales Tax", "Withholding Tax", "Other"]),
  rate: z.number({ error: "Rate is required" }).min(0, "Min 0").max(100, "Max 100"),
  jurisdictionId: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  rate?: TaxRate;
  jurisdictions: TaxJurisdiction[];
  /** No rates yet — the first one becomes the default */
  isFirst?: boolean;
  onSuccess?: () => void;
}

export default function TaxRateForm({ rate, jurisdictions, isFirst, onSuccess }: Props) {
  const isEdit = !!rate;
  const lockedDefault = !!rate?.isDefault || (!isEdit && !!isFirst);
  const create = useCreateTaxRate();
  const update = useUpdateTaxRate();
  const isPending = create.isPending || update.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: rate?.name ?? "",
      type: rate?.type ?? "VAT",
      rate: rate?.rate,
      jurisdictionId: rate?.jurisdictionId ?? NO_JURISDICTION,
      isDefault: lockedDefault,
      isActive: rate?.isActive ?? true,
    },
  });

  const isDefault = form.watch("isDefault");

  const onSubmit = (values: FormValues) => {
    const payload: TaxRatePayload = {
      name: values.name.trim(),
      type: values.type,
      rate: values.rate,
      jurisdictionId: values.jurisdictionId === NO_JURISDICTION ? null : values.jurisdictionId,
    };
    // The API refuses to un-default the current default — only ever send true
    if (values.isDefault && !rate?.isDefault) payload.isDefault = true;
    if (!values.isDefault) payload.isActive = values.isActive;

    if (isEdit) update.mutate({ id: rate.id, payload }, { onSuccess });
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
              <FormLabel>Tax Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. VAT, Standard Sales Tax" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TAX_RATE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate (%)</FormLabel>
                <FormControl>
                  <NumberInput value={field.value} onChange={field.onChange} placeholder="e.g. 7.5" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="jurisdictionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jurisdiction</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No jurisdiction" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_JURISDICTION}>No jurisdiction</SelectItem>
                  {jurisdictions.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">Optional — group rates by country or region</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <div>
                <FormLabel className="mb-0.5">Default Tax Rate</FormLabel>
                <FormDescription className="text-xs">
                  {rate?.isDefault
                    ? "This is the default. To change it, make another rate the default."
                    : !isEdit && isFirst
                      ? "Your first tax rate becomes the default automatically."
                      : "New documents start with the default tax when tax calculation is on."}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(v) => {
                    field.onChange(v);
                    if (v) form.setValue("isActive", true);
                  }}
                  disabled={lockedDefault}
                />
              </FormControl>
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
                <FormDescription className="text-xs">
                  {isDefault
                    ? "The default tax rate is always active."
                    : "Inactive rates can't be picked on new documents."}
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={isDefault || field.value} onCheckedChange={field.onChange} disabled={isDefault} />
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
            "Save Tax Rate"
          )}
        </Button>
      </form>
    </Form>
  );
}

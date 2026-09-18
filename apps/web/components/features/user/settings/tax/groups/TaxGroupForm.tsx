"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowUp, Info, Loader2, X } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTaxGroup, useUpdateTaxGroup } from "@/lib/api/hooks/useTax";
import type { TaxGroup, TaxRate } from "@/lib/api/services/taxService";
import { combinedRate, fmtRate } from "../shared";

const schema = z.object({
  name: z.string().trim().min(1, "Group name is required"),
  taxRateIds: z.array(z.string()).min(1, "Add at least one tax rate"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  group?: TaxGroup;
  rates: TaxRate[];
  compound: boolean;
  onSuccess?: () => void;
}

export default function TaxGroupForm({ group, rates, compound, onSuccess }: Props) {
  const isEdit = !!group;
  const create = useCreateTaxGroup();
  const update = useUpdateTaxGroup();
  const isPending = create.isPending || update.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: group?.name ?? "",
      taxRateIds: group?.rates.map((r) => r.id) ?? [],
      isActive: group?.isActive ?? true,
    },
  });

  const selectedIds = form.watch("taxRateIds");
  const byId = new Map(rates.map((r) => [r.id, r]));
  // Rates already in the group keep their snapshot name/rate even if the rate list hasn't loaded them
  group?.rates.forEach((r) => {
    if (!byId.has(r.id)) byId.set(r.id, { ...r, type: "Other", isDefault: false, isActive: true, jurisdictionId: null });
  });
  const selected = selectedIds.map((id) => byId.get(id)).filter((r): r is TaxRate => !!r);
  const available = rates.filter((r) => r.isActive && !selectedIds.includes(r.id));
  const total = combinedRate(
    selected.map((r) => r.rate),
    compound,
  );

  const setIds = (ids: string[]) => form.setValue("taxRateIds", ids, { shouldValidate: true, shouldDirty: true });
  const move = (index: number, dir: -1 | 1) => {
    const next = [...selectedIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setIds(next);
  };

  const onSubmit = (values: FormValues) => {
    const payload = { name: values.name.trim(), taxRateIds: values.taxRateIds, isActive: values.isActive };
    if (isEdit) update.mutate({ id: group.id, payload }, { onSuccess });
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
              <FormLabel>Group Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. VAT + Levy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="taxRateIds"
          render={() => (
            <FormItem>
              <FormLabel>Tax Rates</FormLabel>
              <Select value="" onValueChange={(id) => id && setIds([...selectedIds, id])}>
                <FormControl>
                  <SelectTrigger className="w-full" disabled={available.length === 0}>
                    <SelectValue placeholder={available.length ? "Add a tax rate" : "No more active rates to add"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {available.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({fmtRate(r.rate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selected.length > 0 && (
                <ol className="space-y-2 mt-2">
                  {selected.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <span className="text-xs text-gray-500 w-4 shrink-0">{i + 1}.</span>
                      <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{r.name}</span>
                      <span className="text-sm text-gray-700 shrink-0">{fmtRate(r.rate)}</span>
                      <div className="flex shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                          aria-label={`Move ${r.name} up`}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === selected.length - 1}
                          onClick={() => move(i, 1)}
                          aria-label={`Move ${r.name} down`}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => setIds(selectedIds.filter((id) => id !== r.id))}
                          aria-label={`Remove ${r.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {selected.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Total rate: <span className="font-medium text-gray-900">{fmtRate(total)}</span>.{" "}
              {compound
                ? "Compound tax is on, so each rate is charged on top of the ones above it — order matters."
                : "Rates are added together. Turn on Compound Tax to charge each rate on top of the previous ones."}
            </span>
          </div>
        )}

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <div>
                <FormLabel className="mb-0.5">Active</FormLabel>
                <FormDescription className="text-xs">Inactive groups can&apos;t be picked on new documents</FormDescription>
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
            "Save Tax Group"
          )}
        </Button>
      </form>
    </Form>
  );
}

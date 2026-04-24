"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import {
  useCreateStatutoryDeduction,
  useUpdateStatutoryDeduction,
} from "@/lib/api/hooks/useSettings";
import { StatutoryDeduction } from "./StatutoryDeductionColumn";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

const tierSchema = z.object({
  from: z.number().min(0, "Min 0"),
  to: z.number().min(0, "Min 0").optional(),
  rate: z.number().min(0, "Min 0").max(100, "Max 100"),
});

const schema = z
  .object({
    name: z.string().min(1, "Deduction name is required"),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "TIERED"]),
    rate: z.number().optional(),
    fixedAmount: z.number().optional(),
    minAmount: z.number().optional(),
    tiers: z.array(tierSchema).optional(),
    description: z.string().optional(),
    accountId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "PERCENTAGE" && (val.rate === undefined || val.rate === null)) {
      ctx.addIssue({ code: "custom", path: ["rate"], message: "Rate is required" });
    }
    if (val.type === "FIXED_AMOUNT" && !val.fixedAmount) {
      ctx.addIssue({ code: "custom", path: ["fixedAmount"], message: "Fixed amount is required" });
    }
    if (val.type === "TIERED" && (!val.tiers || val.tiers.length === 0)) {
      ctx.addIssue({ code: "custom", path: ["tiers"], message: "At least one tier is required" });
    }
  });

type FormValues = z.infer<typeof schema>;
type Tier = { from: number; to?: number; rate: number };

interface Props {
  deduction?: StatutoryDeduction;
  onSuccess?: () => void;
}

const typeOptions = [
  { value: "PERCENTAGE", label: "Percentage of Salary" },
  { value: "FIXED_AMOUNT", label: "Fixed Amount" },
  { value: "TIERED", label: "Tiered" },
];

export default function StatutoryDeductionForm({ deduction, onSuccess }: Props) {
  const isEdit = !!deduction;
  const sym = useEntityCurrencySymbol();
  const create = useCreateStatutoryDeduction();
  const update = useUpdateStatutoryDeduction();
  const { data: accountsData } = useAccounts({ type: "Liabilities" });
  const accounts = (accountsData?.data as any) || [];

  const existingTiers: Tier[] = (deduction as any)?.tiers?.length
    ? (deduction as any).tiers.map((t: any) => ({ from: t.from, to: t.to ?? undefined, rate: t.rate }))
    : [{ from: 0, to: undefined, rate: 0 }];

  const [tiers, setTiers] = useState<Tier[]>(
    (deduction as any)?.type === "TIERED" ? existingTiers : [{ from: 0, to: undefined, rate: 0 }],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: deduction?.name ?? "",
      type: (deduction?.type as any) ?? "PERCENTAGE",
      rate: deduction?.rate ?? undefined,
      fixedAmount: (deduction as any)?.fixedAmount ?? undefined,
      minAmount: (deduction as any)?.minAmount ?? undefined,
      description: deduction?.description ?? "",
      accountId: deduction?.accountId ?? "",
    },
  });

  const watchedType = form.watch("type");
  const isPending = create.isPending || update.isPending;

  // Keep form value in sync with local tier state so superRefine can validate
  useEffect(() => {
    if (watchedType === "TIERED") {
      form.setValue("tiers", tiers, { shouldValidate: true });
    } else {
      form.setValue("tiers", undefined);
    }
  }, [tiers, watchedType]);

  const addTier = () => setTiers((prev) => [...prev, { from: 0, to: undefined, rate: 0 }]);
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof Tier, value: number | undefined) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));

  const onSubmit = (values: FormValues) => {
    const payload: any = {
      name: values.name,
      type: values.type,
      description: values.description,
      accountId: values.accountId || undefined,
    };

    if (values.type === "PERCENTAGE") {
      payload.rate = values.rate;
    } else if (values.type === "FIXED_AMOUNT") {
      payload.fixedAmount = values.fixedAmount;
      payload.minAmount = values.minAmount;
    } else if (values.type === "TIERED") {
      payload.tiers = tiers.map((t) => ({
        from: t.from,
        to: t.to !== undefined && t.to !== null ? t.to : undefined,
        rate: t.rate,
      }));
    }

    if (isEdit) {
      update.mutate({ id: deduction.id, payload }, { onSuccess });
    } else {
      create.mutate(payload, { onSuccess });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deduction Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., PAYEE, NHIS, Pension" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PERCENTAGE */}
        {watchedType === "PERCENTAGE" && (
          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 7.5"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* FIXED_AMOUNT */}
        {watchedType === "FIXED_AMOUNT" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fixedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`Fixed Amount (${sym})`}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`Minimum Salary (${sym})`}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 30000"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Only deduct if salary is above this amount
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* TIERED */}
        {watchedType === "TIERED" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FormLabel>Tax Tiers</FormLabel>
              <Button type="button" size="sm" variant="outline" onClick={addTier}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Tier
              </Button>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_1fr_2.5rem] gap-2 px-1 text-xs font-medium text-muted-foreground">
              <span>{`From (${sym})`}</span>
              <span>{`To (${sym})`}</span>
              <span>Rate (%)</span>
              <span />
            </div>

            {tiers.map((tier, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2.5rem] gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={tier.from}
                  onChange={(e) => updateTier(i, "from", Number(e.target.value))}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="∞"
                  value={tier.to ?? ""}
                  onChange={(e) =>
                    updateTier(i, "to", e.target.value ? Number(e.target.value) : undefined)
                  }
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder="0"
                  value={tier.rate}
                  onChange={(e) => updateTier(i, "rate", Number(e.target.value))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  disabled={tiers.length === 1}
                  onClick={() => removeTier(i)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground mt-1">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Tip: For the last tier, leave the &quot;To&quot; field empty to apply the rate to all
                amounts above the minimum.
              </span>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief description of this deduction" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Corresponding Account</FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code}-{acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the liability account where this deduction will be credited
              </FormDescription>
              <FormMessage />
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
            "Save Deduction"
          )}
        </Button>
      </form>
    </Form>
  );
}

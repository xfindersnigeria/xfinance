"use client";
import React from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateOtherDeduction,
  useUpdateOtherDeduction,
} from "@/lib/api/hooks/useSettings";
import { OtherDeduction } from "./OtherDeductionColumn";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

const schema = z.object({
  name: z.string().min(1, "Deduction name is required"),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  rate: z.number().min(0, "Rate/amount must be 0 or more"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  deduction?: OtherDeduction;
  onSuccess?: () => void;
}

const typeOptions = [
  { value: "FIXED_AMOUNT", label: "Fixed Amount" },
  { value: "PERCENTAGE", label: "Percentage" },
];

export default function OtherDeductionForm({ deduction, onSuccess }: Props) {
  const isEdit = !!deduction;
  const sym = useEntityCurrencySymbol();
  const create = useCreateOtherDeduction();
  const update = useUpdateOtherDeduction();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: deduction?.name ?? "",
      type: deduction?.type ?? "FIXED_AMOUNT",
      rate: deduction?.rate ?? 0,
      description: deduction?.description ?? "",
    },
  });

  const watchedType = form.watch("type");
  const isPending = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      update.mutate({ id: deduction.id, payload: values }, { onSuccess });
    } else {
      create.mutate(values, { onSuccess });
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
                <Input placeholder="e.g., Loan Repayment, Union Dues" {...field} />
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

        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {watchedType === "FIXED_AMOUNT" ? `Rate (%) or Amount (${sym})` : "Rate (%)"}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={watchedType === "FIXED_AMOUNT" ? "5000" : "5"}
                  {...field}
                   onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
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
                  placeholder="Brief description of this deduction"
                  rows={3}
                  {...field}
                />
              </FormControl>
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

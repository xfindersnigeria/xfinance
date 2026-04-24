"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
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
import { Button } from "@/components/ui/button";
import { AddStatementTransactionForm } from "./types";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  transactionType: z.enum(["credit", "debit"]),
  amount: z.number({ error: "Amount is required" }).positive("Must be greater than 0"),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: AddStatementTransactionForm) => void;
}

export default function AddTransactionModal({
  open,
  onOpenChange,
  onAdd,
}: AddTransactionModalProps) {
  const sym = useEntityCurrencySymbol();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: "",
      reference: "",
      description: "",
      transactionType: "credit",
      amount: 0,
      category: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    onAdd({
      date: values.date,
      reference: values.reference,
      description: values.description,
      transactionType: values.transactionType,
      amount: values.amount,
      category: values.category,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Bank Statement Transaction"
      description="Manually enter a transaction from your bank statement"
      module={MODULES.BANKING}
      width="sm:max-w-lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-8 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CHQ/12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Payment from customer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="transactionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Credit (Money In)</SelectItem>
                        <SelectItem value="debit">Debit (Money Out)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {sym}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="pl-7"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Category{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Bank Charges, Interest Income"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Add Transaction
            </Button>
          </div>
        </form>
      </Form>
    </CustomModal>
  );
}

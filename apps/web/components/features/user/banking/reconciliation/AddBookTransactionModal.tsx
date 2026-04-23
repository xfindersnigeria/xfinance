"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { AddBookTransactionForm } from "./types";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  transactionType: z.enum(["credit", "debit"]),
  amount: z.number({ error: "Amount is required" }).positive("Must be greater than 0"),
  payee: z.string().optional(),
  method: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddBookTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: AddBookTransactionForm) => void;
  loading?: boolean;
}

export default function AddBookTransactionModal({
  open,
  onOpenChange,
  onAdd,
  loading,
}: AddBookTransactionModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: "",
      reference: "",
      description: "",
      transactionType: "credit",
      amount: 0,
      payee: "",
      method: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    onAdd({
      date: values.date,
      reference: values.reference,
      description: values.description,
      transactionType: values.transactionType,
      amount: values.amount,
      payee: values.payee,
      method: values.method,
    });
    form.reset();
  };

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Book Transaction"
      description="Record a transaction in the accounting system — this posts to your GL immediately"
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
                  <FormControl><Input type="date" {...field} /></FormControl>
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
                  <FormControl><Input placeholder="e.g., CHQ/12345" {...field} /></FormControl>
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
                <FormControl><Input placeholder="e.g., Bank charges for November" {...field} /></FormControl>
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
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₦</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="pl-7"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="payee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payee <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                  <FormControl><Input placeholder="e.g., First Bank" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Method <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Transfer">Transfer</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                        <SelectItem value="Wire">Wire</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { form.reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Add to Books
            </Button>
          </div>
        </form>
      </Form>
    </CustomModal>
  );
}

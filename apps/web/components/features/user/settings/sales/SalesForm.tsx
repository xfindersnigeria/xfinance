"use client";

import React from "react";
import { toast } from "sonner";
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
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

// Zod schema for Sales Form
const salesFormSchema = z.object({
  invoiceNumberPrefix: z.string().min(1, "Invoice prefix is required"),
  defaultPaymentTerms: z.string().min(1, "Payment terms is required"),
  latePaymentFees: z.boolean().default(false),
  sendPaymentReminders: z.boolean().default(true),
  defaultSalesTaxRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valid percentage required").default("8.25"),
});

type SalesFormData = z.infer<typeof salesFormSchema>;

interface SalesFormProps {
  onSuccess?: () => void;
}

const paymentTermsOptions = [
  { id: "net-15", name: "Net 15" },
  { id: "net-30", name: "Net 30" },
  { id: "net-45", name: "Net 45" },
  { id: "net-60", name: "Net 60" },
  { id: "due-on-receipt", name: "Due on Receipt" },
  { id: "2-10-net-30", name: "2/10 Net 30" },
  { id: "1-10-net-30", name: "1/10 Net 30" },
];

export default function SalesForm({ onSuccess }: SalesFormProps) {
  const form = useForm<SalesFormData>({
    resolver: zodResolver(salesFormSchema) as any,
    defaultValues: {
      invoiceNumberPrefix: "INV-",
      defaultPaymentTerms: "net-30",
      latePaymentFees: false,
      sendPaymentReminders: true,
      defaultSalesTaxRate: "8.25",
    },
  });

  const onSubmit = async (values: SalesFormData) => {
    try {
      console.log("Income Form submitted:", values);
      toast.success("Income settings saved successfully");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to save income settings");
    }
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Income Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Configure your income and invoicing preferences</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Income Settings Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
            {/* Invoice Number Prefix */}
            <div className="pb-6 border-b">
              <FormField
                control={form.control}
                name="invoiceNumberPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Invoice Number Prefix
                    </FormLabel>
                    <FormDescription className="text-sm text-gray-600 mt-1">
                      Prefix used for invoice numbering (e.g., INV-)
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="INV-"
                        className="rounded-lg border-gray-300 mt-2 w-full max-w-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Default Payment Terms */}
            <div className="pb-6 border-b">
              <FormField
                control={form.control}
                name="defaultPaymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Default Payment Terms
                    </FormLabel>
                    <FormDescription className="text-sm text-gray-600 mt-1">
                      Default payment terms for new invoices
                    </FormDescription>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="rounded-lg border-gray-300 mt-2 w-full max-w-md">
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTermsOptions.map((term) => (
                            <SelectItem key={term.id} value={term.id}>
                              {term.name}
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

            {/* Late Payment Fees */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Late Payment Fees
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Automatically add late fees to overdue invoices
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="latePaymentFees"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Send Payment Reminders */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Send Payment Reminders
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Automatically email customers about upcoming/overdue payments
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="sendPaymentReminders"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Default Sales Tax Rate */}
            <div>
              <FormField
                control={form.control}
                name="defaultSalesTaxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Default Sales Tax Rate
                    </FormLabel>
                    <FormDescription className="text-sm text-gray-600 mt-1">
                      Default tax rate applied to new invoices
                    </FormDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="8.25"
                          className="rounded-lg border-gray-300 w-full max-w-md"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-gray-900 font-semibold">%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-6 font-semibold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

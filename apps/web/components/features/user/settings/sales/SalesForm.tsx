"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Save, Loader2 } from "lucide-react";
import { useEntityConfig, useUpdateEntityConfig } from "@/lib/api/hooks/useSettings";

const salesFormSchema = z.object({
  invoiceNumberPrefix: z.string().min(1, "Invoice prefix is required"),
  defaultPaymentTerms: z.string().min(1, "Payment terms is required"),
  latePaymentFees: z.boolean().default(false),
  sendPaymentReminders: z.boolean().default(true),
  defaultSalesTaxRate: z.string().default("0"),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  bankSwiftCode: z.string().optional(),
  invoiceNotes: z.string().optional(),
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
  const { data: configData, isLoading } = useEntityConfig();
  const { mutateAsync: updateConfig, isPending } = useUpdateEntityConfig();

  const config = (configData as any)?.data;

  const form = useForm<SalesFormData>({
    resolver: zodResolver(salesFormSchema) as any,
    defaultValues: {
      invoiceNumberPrefix: "INV-",
      defaultPaymentTerms: "net-30",
      latePaymentFees: false,
      sendPaymentReminders: true,
      defaultSalesTaxRate: "0",
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
      bankRoutingNumber: "",
      bankSwiftCode: "",
      invoiceNotes: "",
    },
  });

  // Prefill form once config loads
  useEffect(() => {
    if (!config) return;
    form.reset({
      invoiceNumberPrefix: config.invoicePrefix || "INV-",
      defaultPaymentTerms: config.paymentTerm || "net-30",
      latePaymentFees: config.lateFees ?? false,
      sendPaymentReminders: config.paymentReminders ?? true,
      defaultSalesTaxRate: config.taxRate != null ? String(config.taxRate) : "0",
      bankName: config.bankName || "",
      bankAccountName: config.bankAccountName || "",
      bankAccountNumber: config.bankAccountNumber || "",
      bankRoutingNumber: config.bankRoutingNumber || "",
      bankSwiftCode: config.bankSwiftCode || "",
      invoiceNotes: config.invoiceNotes || "",
    });
  }, [config]);

  const onSubmit = async (values: SalesFormData) => {
    await updateConfig({
      invoicePrefix: values.invoiceNumberPrefix,
      paymentTerm: values.defaultPaymentTerms,
      lateFees: values.latePaymentFees,
      paymentReminders: values.sendPaymentReminders,
      taxRate: values.defaultSalesTaxRate,
      bankName: values.bankName,
      bankAccountName: values.bankAccountName,
      bankAccountNumber: values.bankAccountNumber,
      bankRoutingNumber: values.bankRoutingNumber,
      bankSwiftCode: values.bankSwiftCode,
      invoiceNotes: values.invoiceNotes,
    });
    if (onSuccess) onSuccess();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin w-5 h-5 mr-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Income Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Configure your income and invoicing preferences</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Settings */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
            <h3 className="font-semibold text-gray-900">Invoice Settings</h3>

            <div className="pb-6 border-b">
              <FormField
                control={form.control}
                name="invoiceNumberPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Invoice Number Prefix
                    </FormLabel>
                    <FormDescription>Prefix used for invoice numbering (e.g., INV-)</FormDescription>
                    <FormControl>
                      <Input placeholder="INV-" className="max-w-md" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pb-6 border-b">
              <FormField
                control={form.control}
                name="defaultPaymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Default Payment Terms
                    </FormLabel>
                    <FormDescription>Default payment terms for new invoices</FormDescription>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="max-w-md">
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

            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">Late Payment Fees</FormLabel>
                <FormDescription>Automatically add late fees to overdue invoices</FormDescription>
              </div>
              <FormField
                control={form.control}
                name="latePaymentFees"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">Send Payment Reminders</FormLabel>
                <FormDescription>Automatically email customers about upcoming/overdue payments</FormDescription>
              </div>
              <FormField
                control={form.control}
                name="sendPaymentReminders"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="defaultSalesTaxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">Default Sales Tax Rate</FormLabel>
                    <FormDescription>Default tax rate applied to new invoices</FormDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" className="max-w-md" {...field} />
                      </FormControl>
                      <span className="font-semibold text-gray-900">%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Bank Details for Invoices */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Bank Details</h3>
              <p className="text-sm text-gray-500 mt-0.5">These details appear on your invoice for payment instructions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Wells Fargo Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAccountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Acme Corp." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankRoutingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Routing Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 021000021" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankSwiftCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SWIFT / BIC Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., WFBIUS65" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Invoice Notes */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Default Invoice Notes</h3>
              <p className="text-sm text-gray-500 mt-0.5">Shown at the bottom of every invoice (payment terms, thank you note, etc.)</p>
            </div>
            <FormField
              control={form.control}
              name="invoiceNotes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Thank you for your business! Payment is due within 30 days. Please include invoice number with your payment."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-white rounded-lg px-8 py-6 font-semibold flex items-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

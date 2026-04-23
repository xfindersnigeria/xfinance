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
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

// Zod schema for Purchases Form
const purchasesFormSchema = z.object({
  billNumberPrefix: z.string().min(1, "Bill prefix is required"),
  purchaseOrderPrefix: z.string().min(1, "PO prefix is required"),
  approvalRequired: z.boolean().default(false),
  approvalThreshold: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valid amount required").default("5000"),
  threeWayMatching: z.boolean().default(false),
});

type PurchasesFormData = z.infer<typeof purchasesFormSchema>;

interface PurchasesFormProps {
  onSuccess?: () => void;
}

export default function PurchasesForm({ onSuccess }: PurchasesFormProps) {
  const form = useForm<PurchasesFormData>({
    resolver: zodResolver(purchasesFormSchema) as any,
    defaultValues: {
      billNumberPrefix: "BILL-",
      purchaseOrderPrefix: "PO-",
      approvalRequired: false,
      approvalThreshold: "5000",
      threeWayMatching: false,
    },
  });

  const onSubmit = async (values: PurchasesFormData) => {
    try {
      console.log("Expense Form submitted:", values);
      toast.success("Expense settings saved successfully");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to save expense settings");
    }
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Expense Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Configure your expense and billing preferences</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Expense Settings Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
            {/* Bill Number Prefix */}
            <div className="pb-6 border-b">
              <FormField
                control={form.control}
                name="billNumberPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Bill Number Prefix
                    </FormLabel>
                    <FormDescription className="text-sm text-gray-600 mt-1">
                      Prefix used for bill numbering (e.g., BILL-)
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="BILL-"
                        className="rounded-lg border-gray-300 mt-2 w-full max-w-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Purchase Order Prefix */}
            <div className="pb-6 border-b">
              <FormField
                control={form.control}
                name="purchaseOrderPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Purchase Order Prefix
                    </FormLabel>
                    <FormDescription className="text-sm text-gray-600 mt-1">
                      Prefix used for purchase order numbering (e.g., PO-)
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="PO-"
                        className="rounded-lg border-gray-300 mt-2 w-full max-w-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Approval Required */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Approval Required
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Require approval for bills above threshold
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="approvalRequired"
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

            {/* Approval Threshold */}
            <div className="pb-6 border-b">
              <FormField
                control={form.control}
                name="approvalThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Approval Threshold
                    </FormLabel>
                    <FormDescription className="text-sm text-gray-600 mt-1">
                      Amount above which approval is required
                    </FormDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gray-900 font-semibold">$</span>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="5000"
                          className="rounded-lg border-gray-300 w-full max-w-md"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 3-Way Matching */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  3-Way Matching
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Match PO, receipt, and invoice before payment
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="threeWayMatching"
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

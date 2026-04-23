"use client";

import React from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
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

// Zod schema for General Configuration Form
const generalConfigSchema = z.object({
  baseCurrency: z.string().min(1, "Base currency is required"),
  multiCurrency: z.boolean().default(false),
  taxCalculation: z.boolean().default(true),
  dateFormat: z.string().min(1, "Date format is required").default("MM/DD/YYYY"),
  numberFormat: z.string().min(1, "Number format is required").default("1,234.56"),
});

type GeneralConfigFormData = z.infer<typeof generalConfigSchema>;

interface GeneralConfigFormProps {
  onSuccess?: () => void;
}

const currencyOptions = [
  { id: "USD", name: "USD - US Dollar" },
  { id: "EUR", name: "EUR - Euro" },
  { id: "GBP", name: "GBP - British Pound" },
  { id: "JPY", name: "JPY - Japanese Yen" },
  { id: "NGN", name: "NGN - Nigerian Naira" },
];

const dateFormatOptions = [
  { id: "MM/DD/YYYY", name: "MM/DD/YYYY" },
  { id: "DD/MM/YYYY", name: "DD/MM/YYYY" },
  { id: "YYYY-MM-DD", name: "YYYY-MM-DD" },
  { id: "MMM DD, YYYY", name: "MMM DD, YYYY" },
];

const numberFormatOptions = [
  { id: "1,234.56", name: "1,234.56" },
  { id: "1.234,56", name: "1.234,56" },
  { id: "1234.56", name: "1234.56" },
];

export default function GeneralConfigForm({
  onSuccess,
}: GeneralConfigFormProps) {
  const form = useForm<GeneralConfigFormData>({
    resolver: zodResolver(generalConfigSchema) as any,
    defaultValues: {
      baseCurrency: "USD",
      multiCurrency: false,
      taxCalculation: true,
      dateFormat: "MM/DD/YYYY",
      numberFormat: "1,234.56",
    },
  });

  const onSubmit = async (values: GeneralConfigFormData) => {
    try {
      console.log("General Configuration submitted:", values);
      toast.success("Configuration saved successfully");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to save configuration");
    }
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">General Configuration</h2>
        <p className="text-sm text-gray-600 mt-1">Manage system-wide settings and formats</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Configuration Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
            {/* Base Currency */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Base Currency
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Primary currency for this entity
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem className="w-48">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Multi-Currency */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Multi-Currency
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Enable transactions in multiple currencies
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="multiCurrency"
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

            {/* Tax Calculation */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Tax Calculation
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Automatically calculate taxes on transactions
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="taxCalculation"
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

            {/* Date Format */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Date Format
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Display format for dates
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <FormItem className="w-48">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dateFormatOptions.map((format) => (
                          <SelectItem key={format.id} value={format.id}>
                            {format.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Number Format */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Number Format
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Display format for numbers
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="numberFormat"
                render={({ field }) => (
                  <FormItem className="w-48">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {numberFormatOptions.map((format) => (
                          <SelectItem key={format.id} value={format.id}>
                            {format.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              Save Configuration
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
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
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

// Zod schema for Currency Adjustment
const currencyAdjustmentSchema = z.object({
  adjustmentDate: z.string().min(1, "Adjustment date is required"),
  baseCurrency: z.string().min(1, "Base currency is required"),
});

type CurrencyAdjustmentFormData = z.infer<typeof currencyAdjustmentSchema>;

interface CurrencyAdjustmentFormProps {
  onSuccess?: () => void;
}

// Mock currency options
const currencyOptions = [
  { id: "USD", name: "USD - US Dollar", symbol: "$" },
  { id: "NGN", name: "NGN - Nigerian Naira", symbol: "₦" },
  { id: "EUR", name: "EUR - Euro", symbol: "€" },
  { id: "GBP", name: "GBP - British Pound", symbol: "£" },
  { id: "JPY", name: "JPY - Japanese Yen", symbol: "¥" },
];

// Mock adjustment data - in real scenario, this would come from API
const getMockAdjustmentData = () => ({
  unrealizedGains: 12450,
  unrealizedLosses: 8200,
});

export default function CurrencyAdjustmentForm({
  onSuccess,
}: CurrencyAdjustmentFormProps) {
  const [adjustmentData, setAdjustmentData] = useState(getMockAdjustmentData());

  const form = useForm<CurrencyAdjustmentFormData>({
    resolver: zodResolver(currencyAdjustmentSchema),
    defaultValues: {
      adjustmentDate: new Date().toISOString().split("T")[0],
      baseCurrency: "USD",
    },
  });

  const netAdjustment = adjustmentData.unrealizedGains - adjustmentData.unrealizedLosses;
  const baseCurrencySymbol = currencyOptions.find(
    (c) => c.id === form.watch("baseCurrency")
  )?.symbol || "₦";

  const onSubmit = async (values: CurrencyAdjustmentFormData) => {
    try {
      console.log("Currency Adjustment submitted:", values);
      toast.success("Currency adjustment posted successfully");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to post currency adjustment");
    }
  };

  const handlePreview = () => {
    toast.info("Previewing currency adjustment...");
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Currency Adjustment</h2>
        <p className="text-sm text-gray-600">Manage foreign exchange gains and losses</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Date and Currency Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="adjustmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">
                    Adjustment Date
                  </FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Calendar className="absolute left-3 w-4 h-4 text-gray-400" />
                      <Input
                        type="date"
                        className="rounded-lg border-gray-300 pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">
                    Base Currency
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full rounded-lg border-gray-300">
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Adjustment Summary */}
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-700 font-medium">Unrealized Gains</span>
              <span className="text-lg font-semibold text-green-600">
                +{baseCurrencySymbol}{adjustmentData.unrealizedGains.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-700 font-medium">Unrealized Losses</span>
              <span className="text-lg font-semibold text-red-600">
                -{baseCurrencySymbol}{adjustmentData.unrealizedLosses.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="text-gray-900 font-semibold text-lg">Net Adjustment</span>
              <span className={`text-2xl font-bold ${netAdjustment >= 0 ? "text-green-600" : "text-red-600"}`}>
                {netAdjustment >= 0 ? "+" : ""}{baseCurrencySymbol}{Math.abs(netAdjustment).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg py-6 font-semibold"
              onClick={handlePreview}
            >
              Preview Adjustment
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-white rounded-lg py-6 font-semibold"
            >
              Post Adjustment
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

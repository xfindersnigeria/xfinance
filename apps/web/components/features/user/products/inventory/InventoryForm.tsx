"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Package } from "lucide-react";
import clsx from "clsx";
import { REASONS } from "./utils/data";
import { inventoryAdjustmentSchema } from "./utils/schema";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

// const ADJUSTMENT_TYPES = [
//   { key: "add", label: "Add Stock", icon: <TrendingUp className="w-5 h-5" /> },
//   { key: "remove", label: "Remove Stock", icon: <TrendingDown className="w-5 h-5" /> },
//   { key: "set", label: "Set Quantity", icon: <Package className="w-5 h-5" /> },
// ];

export default function InventoryForm({
  currentStock = 0,
  onCancel,
  onConfirm,
  isLoading = false,
}: {
  currentStock?: number;
  onCancel?: () => void;
  onConfirm?: (data: any) => void;
  isLoading?: boolean;
}) {
  const form = useForm<z.infer<typeof inventoryAdjustmentSchema>>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: {
      type: "add",
      quantity: 0,
      reason: "",
      notes: "",
    },
  });

  const { watch, setValue } = form;
  const type = watch("type");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onConfirm?.(values))}
        className=""
      >
        {/* Current Stock Level */}
        <div className="rounded-t-xl bg-linear-to-r from-orange-100 to-yellow-50 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-600">Current Stock Level</div>
            <div className="text-3xl font-bold text-primary">
              {currentStock}
            </div>
            <div className="text-xs text-gray-400">units</div>
          </div>
          <div className="bg-orange-200 rounded-full p-3">
            <Package className="w-7 h-7 text-orange-600" />
          </div>
        </div>

        {/* Adjustment Details */}
        <div className="bg-blue-50 rounded-b-xl p-4 mt-0 space-y-4">
          {/* <div className="mb-4">
            <div className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
              Adjustment Details
            </div>
            <div className="flex gap-2 mb-4">
              {ADJUSTMENT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className={clsx(
                    "flex-1 flex flex-col items-center justify-center px-4 py-2 rounded-lg border transition",
                    type === t.key
                      ? "bg-white border-blue-400 shadow text-blue-900 font-semibold"
                      : "bg-transparent border-transparent text-blue-700 hover:bg-white"
                  )}
                  onClick={() => setValue("type", t.key as any)}
                >
                  {t.icon}
                  <span className="mt-1 text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div> */}

          {/* Quantity */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <div className="text-xs text-gray-400 mt-1">
                  {type === "set"
                    ? "Set the new stock quantity"
                    : "Enter the quantity to adjust"}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Reason */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Reason <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional details about this adjustment..."
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
            >
              {isLoading ? "Saving..." : "Confirm Adjustment"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

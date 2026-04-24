"use client";
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Plus, Loader2, ArrowRight, Receipt } from "lucide-react";
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
import { format } from "date-fns";
import {
  useCreateReceipt,
  useUpdateReceipt,
  useCustomers,
  useItems,
} from "@/lib/api/hooks/useSales";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { ItemSelector } from "../invoices/ItemSelector";
import { paymentMethodOptions } from "../payment-received/PaymentReceivedForm";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

export const receiptSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.date(),
  paymentMethod: z.enum([
    "Cash",
    "Card",
    "Bank_Transfer",
    "Mobile_Money",
    "Check",
    "Debit_Card",
    "Credit_Card",
    "ACH",
    "Wire_Transfer",
  ]),
  depositTo: z.string().min(1, "Deposit account is required"),
  lineItems: z
    .array(
      z.object({
        receiptItemId: z.string().optional(), // Server-side receipt item ID for updates
        itemId: z.string().min(1, "Item is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        rate: z.number().min(0, "Unit price must be at least 0"),
      }),
    )
    .min(1, "At least one item is required"),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

interface SalesReceiptsFormProps {
  receipt?: Partial<ReceiptFormData> & { id?: string };
  isEditMode?: boolean;
}

export default function SalesReceiptsForm({
  receipt,
  isEditMode = false,
}: SalesReceiptsFormProps) {
  const sym = useEntityCurrencySymbol();
  const { data, isLoading: customersLoading } = useCustomers();
  const itemsQuery = useItems();
  const items = itemsQuery.data?.items || [];
  const itemsLoading = itemsQuery.isLoading;
  const { data: accountsData, isLoading: accountsLoading } = useAccounts({
    subCategory: "Cash and Cash Equivalents",
  });

  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();

  const customers = data?.customers || [];
  const cashAccounts = (accountsData?.data as any) || [];

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      customerId: receipt?.customerId || "",
      date: receipt?.date ? new Date(receipt.date as any) : new Date(),
      paymentMethod: receipt?.paymentMethod || "Cash",
      depositTo: (receipt as any)?.depositTo || "",
      lineItems: receipt?.lineItems || [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);

  const handleRemove = (index: number) => {
    const item = form.getValues(`lineItems.${index}` as any);
    // Track server-side receipt item ID for deletion
    const receiptLineId =
      (item && ((item as any).receiptItemId || (item as any).id)) || null;
    if (receiptLineId) {
      setRemovedItemIds((prev) => [...prev, receiptLineId]);
    }
    remove(index);
  };

  useEffect(() => {
    if (receipt) {
      // Reset non-array fields
      form.reset({
        customerId: receipt?.customerId || "",
        date: receipt?.date ? new Date(receipt.date as any) : new Date(),
        paymentMethod: receipt?.paymentMethod || "Cash",
        lineItems: [],
      });

      // Replace field array with server items to avoid double entries
      // Store server receipt-item id under `receiptItemId`
      const mapped = (receipt as any)?.items
        ? typeof (receipt as any).items[0] === "string"
          ? (receipt as any).items.map((i: string) => {
              const parsed = JSON.parse(i);
              return {
                receiptItemId: parsed.id || parsed.receiptItemId,
                itemId: parsed.itemId,
                rate: parsed.unitPrice,
                quantity: parsed.quantity,
              };
            })
          : (receipt as any).items.map((ii: any) => ({
              receiptItemId: ii.id || ii.receiptItemId,
              itemId: ii.itemId,
              rate: ii.rate,
              quantity: ii.quantity,
            }))
        : receipt?.lineItems || [{ itemId: "", quantity: 1, rate: 0 }];
      replace(mapped as any[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  const total = form
    .watch("lineItems")
    .reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);

  const onSubmit = async (values: ReceiptFormData) => {
    try {
      // Calculate total as integer
      const subtotal = values.lineItems.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.rate || 0),
        0,
      );
      const totalAmount = Math.round(subtotal);

      if (isEditMode && receipt?.id) {
        // Build items array for update: include `id` for existing items
        const items = values.lineItems.map((li: any) => {
          const out: any = {
            itemId: li.itemId,
            rate: Number(li.rate) || 0,
            quantity: Number(li.quantity) || 0,
          };
          // Server-side receipt-item id is stored as `receiptItemId` in the form
          if (li.receiptItemId) out.id = li.receiptItemId;
          return out;
        });

        const payload: any = {
          items,
          total: totalAmount,
          depositTo: values.depositTo,
          status: "Completed",
        };
        if (removedItemIds.length > 0) payload.removeItemIds = removedItemIds;

        await updateReceipt.mutateAsync({ id: receipt.id, data: payload });
      } else {
        // Create payload: transform to match API format
        const items = values.lineItems.map((li) => ({
          itemId: li.itemId,
          rate: Number(li.rate) || 0,
          quantity: Number(li.quantity) || 0,
        }));

        const payload = {
          customerId: values.customerId,
          date: values.date,
          paymentMethod: values.paymentMethod,
          depositTo: values.depositTo,
          items,
          total: totalAmount,
          status: "Completed",
        };

        await createReceipt.mutateAsync(payload);
      }
    } catch (error) {
      // error handled below
    }
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <div className="bg-blue-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-2">Customer & Date</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-center">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={customersLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              customersLoading
                                ? "Loading customers..."
                                : "Select customer"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(customers) && customers.length > 0 ? (
                            customers.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-customers" disabled>
                              No customers found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={format(field.value, "yyyy-MM-dd")}
                        onChange={(e) =>
                          field.onChange(new Date(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl pt-4">
            <h6 className="font-medium text-sm mb-2">Payment Information</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-center">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethodOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depositTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Deposit To <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full" disabled={accountsLoading}>
                          <SelectValue placeholder="Select cash account" />
                        </SelectTrigger>
                        <SelectContent>
                          {cashAccounts.length > 0 ? (
                            cashAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.code})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-accounts" disabled>
                              No cash accounts found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="rounded-lg border p-4 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-green-900 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Line Items *
              </h4>
              {/* Hide Add Item button if all items are selected */}
              {fields.length < items.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemId: "", quantity: 1, rate: 0 })}
                >
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {/* Header Row */}
              <div className="grid grid-cols-[4fr_1fr_1fr_2fr] gap-2 w-full px-2 py-2 text-sm font-semibold text-gray-700 border-b">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-center">Rate</span>
                {/* <span className="text-right">Total</span> */}
              </div>
              {fields.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 bg-white rounded-xl p-2 shadow-sm"
                >
                  <div className="flex justify-between w-full items-center">
                    <p className="">Item {idx + 1}</p>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-[3fr_1.5fr_1.5fr] gap-2 w-full items-center">
                    <Controller
                      control={form.control}
                      name={`lineItems.${idx}.itemId`}
                      render={({ field }) => {
                        // Get all selected itemIds except the current one
                        const selectedIds = form
                          .watch("lineItems")
                          .map((li, i) => (i !== idx ? li.itemId : null))
                          .filter(Boolean);
                        return (
                          <ItemSelector
                            items={items}
                            isLoading={itemsLoading}
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                              const selectedItem = items.find(
                                (i: any) => i.id === val,
                              );
                              if (selectedItem) {
                                form.setValue(
                                  `lineItems.${idx}.rate`,
                                  Number(selectedItem.unitPrice) || 0,
                                );
                              }
                            }}
                            placeholder="Select item..."
                            disabledIds={selectedIds as any}
                          />
                        );
                      }}
                    />
                    <Controller
                      control={form.control}
                      name={`lineItems.${idx}.quantity`}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          // className="w-16"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name={`lineItems.${idx}.rate`}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          // className="w-24"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          prefix={sym}
                          disabled={true}
                        />
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Subtotal */}
            <div className="mt-2 flex flex-col gap-1 text-sm bg-white rounded-xl p-3">
              <div className="flex justify-between items-center">
                <p className="text-base font-normal">Total:</p>
                <span className="font-semibold">
                  {sym}
                  {total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-1 pb-3">
            <Button variant={"outline"} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              className=""
              disabled={createReceipt.isPending || updateReceipt.isPending}
            >
              {createReceipt.isPending || updateReceipt.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  <span>Please wait</span>
                </>
              ) : (
                <>
                  <span>{isEditMode ? "Update Receipt" : "Add Receipt"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

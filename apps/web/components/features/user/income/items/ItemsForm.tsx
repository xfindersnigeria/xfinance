"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
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
import { ArrowRight, Loader2 } from "lucide-react";
import { itemFormSchema, ItemFormInputs } from "./utils/schema";
import { itemCategories, itemTypes } from "./utils/data";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { useCreateItem, useUpdateItem } from "@/lib/api/hooks/useSales";
import z from "zod";

interface ItemsFormProps {
  item?: Partial<ItemFormInputs> & { id?: string };
  isEditMode?: boolean;
}

/**
 * Form component for creating/editing items
 * Handles both Service and Good types
 * Integrates with modal provider for state management
 */
export default function ItemsForm({
  item,
  isEditMode = false,
}: ItemsFormProps) {
  const { closeModal } = useModal();

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const { data: accountsData, isLoading: accountsLoading } = useAccounts({
    type: "Revenue",
  });
  const incomeAccounts = (accountsData?.data as any) || [];

  const form = useForm<ItemFormInputs>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      code: item?.code || "",
      name: item?.name || "",
      description: item?.description || "",
      type: item?.type || "service",
      category: item?.category || "",
      unitPrice: item?.unitPrice || 0,
      incomeAccountId: item?.incomeAccountId || "4100",
      isTaxable: item?.isTaxable ?? false,
      isActive: item?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        code: item.code || "",
        name: item.name || "",
        description: item.description || "",
        type: item.type || "service",
        category: item.category || "",
        unitPrice: item.unitPrice || 0,
        incomeAccountId: item.incomeAccountId || "4100",
        isTaxable: item.isTaxable ?? false,
        isActive: item.isActive ?? true,
      });
    }
  }, [item]);

  const onSubmit = async (values: z.infer<typeof itemFormSchema>) => {
    try {
      // setLoading(true);

      const payload = {
        code: values.code,
        name: values.name,
        category: values.category,
        description: values.description || "",
        unitPrice: Math.round(Number(values.unitPrice)),
        type: values.type.toLowerCase(),
        isTaxable: values.isTaxable,
        incomeAccountId: values.incomeAccountId,
        isActive: values.isActive,
      };

      if (isEditMode && item?.id) {
        await updateItem.mutateAsync({ id: item.id, data: payload });
        // toast.success("Product updated successfully!");
      } else {
        await createItem.mutateAsync(payload);
        // toast.success("Product created successfully!");
      }

      // form.reset();
      // setLoading(false);
    } catch (error) {
      console.error("Error submitting product:", error);
      // toast.error("Failed to save product");
      // setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          {/* Item Details Section */}
          <div className="bg-indigo-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-3">Item Details</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., SRV-CONS-001"
                        {...field}
                        className="rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Consulting Services"
                        {...field}
                        className="rounded-lg"
                      />
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
                <FormItem className="mt-4">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the item"
                      {...field}
                      className="rounded-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Classification Section */}
          <div className="bg-blue-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-3">Classification</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
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
          </div>

          {/* Pricing Section */}
          <div className="bg-green-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-3">Pricing & Revenue</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="incomeAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Income Account</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger
                          className="w-full truncate"
                          disabled={accountsLoading}
                        >
                          <SelectValue placeholder="Select income account" />
                        </SelectTrigger>
                        <SelectContent>
                          {incomeAccounts.length > 0 ? (
                            incomeAccounts.map((account: any) => (
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

          {/* Settings Section */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <h6 className="font-medium text-sm mb-3">Settings</h6>
            <div className="flex flex-col gap-3">
              <FormField
                control={form.control}
                name="isTaxable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-3">
                    <FormLabel className="cursor-pointer">
                      This item is taxable
                    </FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-3">
                    <FormLabel className="cursor-pointer">
                      Mark as active
                    </FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg flex-1"
              onClick={() =>
                closeModal(
                  isEditMode
                    ? MODAL.ITEM_EDIT + "-" + item?.id
                    : MODAL.ITEM_CREATE,
                )
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-lg flex-1 gap-2"
              disabled={createItem.isPending || updateItem.isPending}
            >
              {createItem.isPending || updateItem.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isEditMode ? "Update Item" : "Create Item"}{" "}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  useCreateStoreSupply,
  useUpdateStoreSupply,
} from "@/lib/api/hooks/useAssets";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { Loader2 } from "lucide-react";
// import { toast } from "sonner";

const supplySchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "Unit price is required"),
  quantity: z.number().min(0, "Quantity is required"),
  minQuantity: z.number().min(0, "Minimum quantity is required"),
  location: z.string().optional(),
  supplier: z.string().optional(),
});

type SupplyFormValues = z.infer<typeof supplySchema>;

interface StoreSupplyFormProps {
  supply?: any;
  isEditMode?: boolean;
  closeModal?: () => void;
}

export default function StoreSupplyForm({
  supply,
  isEditMode,
  closeModal,
}: StoreSupplyFormProps) {
  const form = useForm<SupplyFormValues>({
    resolver: zodResolver(supplySchema),
    defaultValues: {
      name: "",
      sku: "",
      quantity: 0,
      location: "",
      description: "",
      category: "",
      unitPrice: 0,
      minQuantity: 0,
      supplier: "",
    },
  });

  const createMutation = useCreateStoreSupply();
  const updateMutation = useUpdateStoreSupply();
  const sym = useEntityCurrencySymbol();

  useEffect(() => {
    if (isEditMode && supply) {
      form.reset({
        name: supply.name || "",
        sku: supply.sku || "",
        quantity: supply.quantity ?? 0,
        location: supply.location || "",
        description: supply.description || "",
        category: supply.category || "",
        unitPrice: supply.unitPrice ?? 0,
        minQuantity: supply.minQuantity ?? 0,
        supplier: supply.supplier || "",
      });
    }
  }, [isEditMode, supply, form]);

  const onSubmit = async (values: SupplyFormValues) => {
    try {
      if (isEditMode && supply?.id) {
        await updateMutation.mutateAsync({ id: supply.id, data: values });
        // toast.success("Supply updated successfully");
      } else {
        await createMutation.mutateAsync(values);
        // toast.success("Supply created successfully");
      }
      // if (onSuccess) onSuccess();
    } catch (error: any) {
      // toast.error(error?.message || "Failed to save supply");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white p-4 rounded-xl">
          <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>
                    Item Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., A4 Paper (Ream)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>
                    Category <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange}>
                      <SelectTrigger className="w-full rounded-2xl">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stationery">Stationery</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Cleaning Supplies">
                          Cleaning Supplies
                        </SelectItem>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Food & Beverage">
                          Food & Beverage
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>SKU / Product Code *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., PP-A4-500" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter item description..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pricing & Inventory Section */}
        <div className="bg-blue-50 p-6 rounded-xl">
          <h3 className="font-semibold text-lg mb-4">Pricing & Inventory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {`Unit Price (${sym})`} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantity on Hand <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Quantity *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                  </FormControl>
                  <span className="text-xs text-gray-500">
                    Alert will be triggered when stock falls below this level
                  </span>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>{`Total Value (${sym})`}</FormLabel>
              <Input
                value={`${sym}${(form.watch("unitPrice") || 0) * (form.watch("quantity") || 0)}`}
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Storage & Supplier Section */}
        <div className="bg-yellow-50 p-6 rounded-xl">
          <h3 className="font-semibold text-lg mb-4">Storage & Supplier</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Supply Room A" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Supplier</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Office Depot" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button onClick={closeModal} type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" className="">
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditMode ? "Update Supply" : "Add Supply"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

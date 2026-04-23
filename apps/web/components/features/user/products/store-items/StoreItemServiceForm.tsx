"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { serviceCategories, serviceUnits } from "./utils/data";
import { useEffect, useState } from "react";
import { serviceSchema } from "./utils/schema";
import z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStoreItem, useUpdateStoreItem } from "@/lib/api/hooks/useProducts";
import { StoreItemTypeEnum } from "@/lib/api/hooks/types/productsTypes";

const defaultService = {
  name: "",
  categoryId: "",
  unitId: "",
  description: "",
  rate: "",
  taxable: false,
};

export default function StoreItemServiceForm({
  item,
  isEditMode = false,
  categories,
  units,
  unitsLoading,
  categoriesLoading,
}: {
  item?: any;
  isEditMode?: boolean;
  categories: any;
  units: any;

  unitsLoading: boolean;
  categoriesLoading: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const createItem = useCreateStoreItem();
  const updateItem = useUpdateStoreItem();

  const form = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues:
      isEditMode && item ? { ...defaultService, ...item } : defaultService,
  });

  useEffect(() => {
    if (isEditMode && item) {
      form.reset({ ...defaultService, ...item });
    }
  }, [isEditMode, item]);

  const onSubmit = async (values: z.infer<typeof serviceSchema>) => {
    try {
      setLoading(true);

      const payload = {
        name: values.name,
        categoryId: values.categoryId,
        unitId: values.unitId,
        description: values.description || "",
        rate: Math.round(Number(values.rate) * 100),
        taxable: values.taxable,
        currentStock: 0,
        lowStock: 0,
        sku: `SVC-${Date.now()}`,
        type: StoreItemTypeEnum.Service,
      };

      if (isEditMode && item?.id) {
        await updateItem.mutateAsync({ id: item.id, data: payload });
        toast.success("Service updated successfully!");
      } else {
        await createItem.mutateAsync(payload);
        toast.success("Service created successfully!");
      }

      form.reset();
      setLoading(false);
    } catch (error) {
      console.error("Error submitting service:", error);
      toast.error("Failed to save service");
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="bg-blue-50 p-4 rounded-xl mb-4">
          <h6 className="font-medium text-sm mb-2">Basic Information</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Consulting Service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full border px-2 py-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                       {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
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
              name="unitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full border px-2 py-1">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
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
              name="description"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Service description and deliverables..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl mb-4">
          <h6 className="font-medium text-sm mb-2 flex items-center gap-2">
            <span className="text-xl">💲</span> Pricing
          </h6>
          <div className="mb-4">
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Rate <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                        ₦
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-8"
                        min={0}
                        step="0.01"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.replace(/^0+(?=\d)/, ""),
                          )
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="taxable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border">
                  <div>
                    <FormLabel className="font-semibold mb-0">
                      Taxable Item
                    </FormLabel>
                    <div className="text-gray-500 text-sm -mt-1">
                      Apply tax to this item
                    </div>
                  </div>
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
        <div className="flex justify-end mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              console.log("fjfj");
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 text-white"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : isEditMode
                ? "Update Service"
                : "Add Service"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

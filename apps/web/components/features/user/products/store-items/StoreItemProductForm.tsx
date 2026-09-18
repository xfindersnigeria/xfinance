"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCreateStoreItem, useUpdateStoreItem } from "@/lib/api/hooks/useProducts";
import { StoreItemTypeEnum } from "@/lib/api/hooks/types/productsTypes";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { productSchema, type ProductFormValues } from "./utils/schema";
import { applyImageChange, StoreItemImagePicker, type ImageChange } from "./StoreItemImagePicker";

const defaultProduct: ProductFormValues = {
  name: "",
  sku: "",
  categoryId: "",
  unitId: "",
  description: "",
  sellingPrice: undefined as unknown as number,
  costPrice: undefined,
  taxable: false,
  trackInventory: true,
  currentStock: 0,
  lowStockAlert: 10,
  sellOnline: false,
};

/** API item → form values (amounts are whole currency units; nulls become blanks) */
function toFormValues(item: any): ProductFormValues {
  return {
    name: item?.name ?? "",
    sku: item?.sku ?? "",
    categoryId: item?.categoryId ?? item?.category?.id ?? "",
    unitId: item?.unitId ?? item?.unit?.id ?? "",
    description: item?.description ?? "",
    sellingPrice: item?.sellingPrice ?? item?.rate ?? (undefined as unknown as number),
    costPrice: item?.costPrice ?? undefined,
    taxable: !!item?.taxable,
    trackInventory: item?.trackInventory ?? true,
    currentStock: item?.currentStock ?? 0,
    lowStockAlert: item?.lowStock ?? 0,
    sellOnline: !!item?.sellOnline,
  };
}

export default function StoreItemProductForm({
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
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  // The form finishes the save itself (image upload, toast, close)
  const createItem = useCreateStoreItem({ onSuccess: () => undefined });
  const updateItem = useUpdateStoreItem({ onSuccess: () => undefined });
  const sym = useEntityCurrencySymbol();
  const [image, setImage] = useState<ImageChange>({ file: null, removed: false });
  const [savingImage, setSavingImage] = useState(false);
  const loading = createItem.isPending || updateItem.isPending || savingImage;
  const modalKey = isEditMode && item?.id ? `${MODAL.ITEM_EDIT}-${item.id}` : MODAL.ITEM_CREATE;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: isEditMode && item ? toFormValues(item) : defaultProduct,
  });
  const trackInventory = form.watch("trackInventory");

  useEffect(() => {
    if (isEditMode && item) form.reset(toFormValues(item));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, item?.id]);

  const onSubmit = async (values: ProductFormValues) => {
    const payload = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      unitId: values.unitId,
      sku: values.sku?.trim() || null,
      description: values.description || "",
      sellingPrice: Math.round(values.sellingPrice),
      costPrice: values.costPrice != null ? Math.round(values.costPrice) : null,
      taxable: values.taxable,
      lowStock: values.lowStockAlert ?? 0,
      type: StoreItemTypeEnum.Product,
      sellOnline: values.sellOnline,
      trackInventory: values.trackInventory,
      // Opening stock on create only — afterwards stock moves through inventory adjustments
      ...(isEditMode ? {} : { currentStock: values.trackInventory ? values.currentStock ?? 0 : 0 }),
    };

    let saved: any;
    try {
      saved =
        isEditMode && item?.id
          ? await updateItem.mutateAsync({ id: item.id, data: payload })
          : await createItem.mutateAsync(payload);
    } catch {
      return; // the hook already showed the error
    }

    if (image.file || image.removed) {
      setSavingImage(true);
      await applyImageChange(saved?.id ?? item?.id, image, !!item?.imageUrl);
      setSavingImage(false);
    }
    queryClient.invalidateQueries({ queryKey: ["store-items"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    toast.success(isEditMode ? "Product updated" : "Product added");
    if (!isEditMode) {
      form.reset(defaultProduct);
      setImage({ file: null, removed: false });
    }
    closeModal(modalKey);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="bg-green-50 p-4 rounded-xl mb-4">
          <h6 className="font-medium text-sm mb-2">Basic Information</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Premium Widget A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="WDG-A-001" {...field} value={field.value ?? ""} />
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
                    <Select value={field.value} onValueChange={field.onChange} disabled={categoriesLoading}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={categoriesLoading ? "Loading..." : "Select category"} />
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
                  <FormLabel>Unit *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} disabled={unitsLoading}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={unitsLoading ? "Loading..." : "Select unit"} />
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
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Product description for customers..." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 space-y-2">
              <FormLabel>Image</FormLabel>
              <StoreItemImagePicker
                currentUrl={isEditMode ? item?.imageUrl : null}
                value={image}
                onChange={setImage}
                disabled={loading}
              />
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl mb-4">
          <h6 className="font-medium text-sm mb-2">Pricing</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sellingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price *</FormLabel>
                  <FormControl>
                    <NumberInput value={field.value} onChange={field.onChange} placeholder={`${sym}0.00`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Price</FormLabel>
                  <FormControl>
                    <NumberInput value={field.value} onChange={field.onChange} placeholder={`${sym}0.00`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxable"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <div className="flex items-center justify-between gap-4 bg-white rounded-xl px-4 py-3 border">
                    <div>
                      <div className="font-semibold text-base leading-tight">Taxable Item</div>
                      <div className="text-gray-500 text-sm leading-tight">Apply tax to this item</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl mb-4">
          <h6 className="font-medium text-sm mb-2">Inventory</h6>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="trackInventory"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 bg-white rounded-xl px-4 py-3 border">
                    <div>
                      <div className="font-semibold text-base leading-tight">Track Inventory</div>
                      <div className="text-gray-500 text-sm leading-tight">
                        Monitor stock levels for this item
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {trackInventory && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isEditMode ? "Current Stock" : "Opening Stock"}</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0"
                          disabled={isEditMode}
                        />
                      </FormControl>
                      {isEditMode && (
                        <FormDescription>Change stock from Inventory (stock adjustments).</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowStockAlert"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Alert</FormLabel>
                      <FormControl>
                        <NumberInput value={field.value} onChange={field.onChange} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="sellOnline"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 bg-white rounded-xl px-4 py-3 border">
                    <div>
                      <div className="font-semibold text-base leading-tight">Sell on Online Store</div>
                      <div className="text-gray-500 text-sm leading-tight">
                        Make this item available on your online store
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <Button type="button" variant="outline" onClick={() => closeModal(modalKey)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="bg-green-600 text-white" disabled={loading}>
            {savingImage ? "Uploading image..." : loading ? "Saving..." : isEditMode ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStoreItem, useUpdateStoreItem } from "@/lib/api/hooks/useProducts";
import { StoreItemTypeEnum } from "@/lib/api/hooks/types/productsTypes";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { serviceSchema, type ServiceFormValues } from "./utils/schema";
import { applyImageChange, StoreItemImagePicker, type ImageChange } from "./StoreItemImagePicker";

const defaultService: ServiceFormValues = {
  name: "",
  categoryId: "",
  unitId: "",
  description: "",
  rate: undefined as unknown as number,
  taxable: false,
  sellOnline: false,
};

function toFormValues(item: any): ServiceFormValues {
  return {
    name: item?.name ?? "",
    categoryId: item?.categoryId ?? item?.category?.id ?? "",
    unitId: item?.unitId ?? item?.unit?.id ?? "",
    description: item?.description ?? "",
    rate: item?.rate ?? item?.sellingPrice ?? (undefined as unknown as number),
    taxable: !!item?.taxable,
    sellOnline: !!item?.sellOnline,
  };
}

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

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: isEditMode && item ? toFormValues(item) : defaultService,
  });

  useEffect(() => {
    if (isEditMode && item) form.reset(toFormValues(item));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, item?.id]);

  const onSubmit = async (values: ServiceFormValues) => {
    // Whole currency units like every other amount — the API mirrors rate into sellingPrice
    const payload = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      unitId: values.unitId,
      description: values.description || "",
      rate: Math.round(Number(values.rate)),
      taxable: values.taxable,
      sellOnline: values.sellOnline,
      trackInventory: false,
      type: StoreItemTypeEnum.Service,
      ...(isEditMode ? {} : { currentStock: 0, lowStock: 0, sku: `SVC-${Date.now()}` }),
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
    toast.success(isEditMode ? "Service updated" : "Service added");
    if (!isEditMode) {
      form.reset(defaultService);
      setImage({ file: null, removed: false });
    }
    closeModal(modalKey);
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
                <FormItem className="md:col-span-2">
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
                    <Textarea
                      placeholder="Service description and deliverables..."
                      {...field}
                      value={field.value ?? ""}
                    />
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
        <div className="bg-purple-50 p-4 rounded-xl mb-4">
          <h6 className="font-medium text-sm mb-2">Pricing</h6>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Rate <span className="text-red-500">*</span>
                  </FormLabel>
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
                <FormItem>
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
            <FormField
              control={form.control}
              name="sellOnline"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 bg-white rounded-xl px-4 py-3 border">
                    <div>
                      <div className="font-semibold text-base leading-tight">Sell on Online Store</div>
                      <div className="text-gray-500 text-sm leading-tight">
                        Make this service available on your online store
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
          <Button type="submit" className="bg-blue-600 text-white" disabled={loading}>
            {savingImage ? "Uploading image..." : loading ? "Saving..." : isEditMode ? "Update Service" : "Add Service"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

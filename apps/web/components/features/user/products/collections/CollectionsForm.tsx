"use client";

import React, { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { FolderArchive, Image, Plus, Trash2 } from "lucide-react";
import { collectionSchema } from "./utils/schema";
import {
  useCreateCollection,
  useStoreItems,
  useUpdateCollection,
} from "@/lib/api/hooks/useProducts";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { ItemSelector } from "../../income/invoices/ItemSelector";
import { StoreItemsResponse } from "@/lib/api/hooks/types/productsTypes";

type CollectionFormData = z.infer<typeof collectionSchema>;

export default function CollectionsForm({
  collection,
  isEditMode = false,
}: {
  collection?: Partial<CollectionFormData> & { id?: string };
  isEditMode?: boolean;
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // console.log(collection, "collection in form");
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();

  const isSubmitting = createCollection.isPending || updateCollection.isPending;

  const itemsQuery = useStoreItems() as {
    data?: StoreItemsResponse;
    isLoading: boolean;
  };
  const items = itemsQuery.data?.items || [];
  const itemsLoading = itemsQuery.isLoading;

  // console.log(items, "Available items for selection"); // Debug log to check fetched items

  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: collection?.name || "",
      slug: collection?.slug || "",
      description: collection?.description || "",
      image: collection?.image?.secureUrl || undefined,
      visible: collection?.visible !== undefined ? collection.visible : true,
      featured:
        collection?.featured !== undefined ? collection.featured : false,
      items: collection?.items || [],
    },
  });

  useEffect(() => {
    if (collection) {
      // If items are objects, convert to array of IDs for the form
      const itemIds = Array.isArray(collection.items)
        ? collection.items.map((item: any) =>
            typeof item === "string" ? item : item.id,
          )
        : [];
      form.reset({
        name: collection?.name || "",
        slug: collection?.slug || "",
        description: collection?.description || "",
        image: collection?.image?.secureUrl || undefined,
        visible: collection?.visible ?? true,
        featured: collection?.featured ?? false,
        items: itemIds,
      });
      // Show preview if image is a URL
      if (collection.image?.secureUrl) {
        setImagePreview(collection.image.secureUrl);
      }
    }
  }, [collection]);

  const onSubmit = async (values: CollectionFormData) => {
    try {
      // setIsSubmitting(true);

      const formData = new FormData();
      formData.append("name", values.name);
      // formData.append("slug", values.slug);
      formData.append("description", values.description || "");
      formData.append("visibility", String(values.visible));
      formData.append("featured", String(values.featured));
      formData.append("itemIds", JSON.stringify(values.items));

      if (values.image && values.image instanceof File) {
        formData.append("image", values.image);
      }

      if (isEditMode && collection?.id) {
        await updateCollection.mutateAsync({ id: collection.id, formData });
      } else {
        await createCollection.mutateAsync(formData);
      }

      // form.reset();
      setImagePreview(null);
      // setIsSubmitting(false);
    } catch (error) {
      console.error("Error submitting collection:", error);
      // toast.error("Failed to save collection");
      // setIsSubmitting(false);
    }
  };

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  const handleRemove = (index: number) => {
    const item = form.getValues(`items.${index}` as any);
    // Prefer server collection-line id stored on the value as `collectionItemId`.
    const collectionLineId =
      (item && ((item as any).collectionItemId || (item as any).id)) || null;
    if (collectionLineId) {
      setRemovedItemIds((prev) => [...prev, collectionLineId]);
    }
    remove(index);
  };

  const openConfirm = (index: number) => {
    const item = form.getValues(`items.${index}` as any);
    // If item exists on server (has id) show confirmation modal
    if (item && ((item as any).collectionItemId || (item as any).id)) {
      setConfirmIndex(index);
      setConfirmOpen(true);
    } else {
      // new item, remove immediately
      handleRemove(index);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("image", file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Calculate if all items are selected
  const maxItemsSelected = form.watch("items").length >= items.length;

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Collection Details */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h6 className="font-medium text-sm mb-3 text-blue-900 flex items-center gap-2">
              <span className=" w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center">
                <FolderArchive className="w-4 h-4 text-blue-600" />
              </span>
              Collection Details
            </h6>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Summer Collection 2025"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="summer-collection-2025"
                        {...field}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.replace(/\s+/g, "-").toLowerCase()
                          )
                        }
                      />
                    </FormControl>
                    <div className="text-xs text-gray-400 mt-1">
                      http://yourstore.com/collections/
                      <span className="text-gray-500">
                        {field.value || "collection-name"}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this collection..."
                        {...field}
                      />
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
              {!maxItemsSelected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append("")}
                >
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {fields.map((item, idx) => {
                // Find the item object for display
                const selectedItem = items.find(
                  (i) => i.id === form.watch(`items.${idx}`),
                );
                // All selected except the current one
                const selectedIds = form
                  .watch("items")
                  .filter((id: string, i: number) => i !== idx);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 bg-white rounded-xl p-2 shadow-sm"
                  >
                    <div className="flex justify-between w-full items-center">
                      <p className="">
                        {selectedItem ? selectedItem.name : `Item ${idx + 1}`}
                      </p>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openConfirm(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 w-full items-center">
                      <Controller
                        control={form.control}
                        name={`items.${idx}`}
                        render={({ field }) => (
                          <ItemSelector
                            items={items}
                            isLoading={itemsLoading}
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                            }}
                            placeholder="Select item..."
                            disabledIds={selectedIds}
                          />
                        )}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Confirmation modal for removing existing items */}
              <CustomModal
                open={confirmOpen}
                onOpenChange={(open) => setConfirmOpen(open)}
                title="Remove item"
                description="Are you sure you want to remove this item from the collection?"
                module={MODULES.PRODUCTS}
              >
                <div className="p-4">
                  <p className="mb-4">
                    This will remove the item from the collection. This action
                    can be undone by adding the item again.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirmIndex !== null) {
                          handleRemove(confirmIndex);
                        }
                        setConfirmIndex(null);
                        setConfirmOpen(false);
                      }}
                      variant="destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CustomModal>
            </div>
          </div>

          {/* Collection Image */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h6 className="font-medium text-sm mb-3 text-blue-900 flex items-center gap-2">
              <span className=" w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center">
                <Image className="w-4 h-4 text-blue-600" />
              </span>
              Collection Image
            </h6>
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-xl p-6 cursor-pointer bg-white hover:bg-blue-50 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg mb-2"
                />
              ) : (
                <>
                  <div className="flex flex-col items-center">
                    <Image className="w-10 h-10 text-blue-600" />
                    <div className="text-gray-400 text-sm mt-2">
                      Click to upload or drag and drop
                    </div>
                    <div className="text-xs text-gray-400">
                      PNG, JPG up to 5MB
                    </div>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="rounded-xl p-0 border border-blue-100 bg-linear-to-br from-blue-50 via-white to-blue-50">
            <h6 className="font-semibold text-base mb-0 px-6 pt-5 pb-2 text-blue-900 flex items-center gap-2">
              <span className=" w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Z"
                    fill="var(--primary)"
                    fillOpacity=".15"
                  />
                  <path
                    d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
                    fill="var(--primary)"
                  />
                </svg>
              </span>
              Visibility Settings
            </h6>
            <div className="flex flex-col gap-3 px-4 pb-4">
              <FormField
                control={form.control}
                name="visible"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm border border-blue-100">
                    <div>
                      <FormLabel className="font-semibold text-gray-800">
                        Visible on Online Store
                      </FormLabel>
                      <div className="text-xs text-gray-400">
                        Show this collection to customers
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
              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm border border-blue-100">
                    <div>
                      <FormLabel className="font-semibold text-gray-800">
                        Featured Collection
                      </FormLabel>
                      <div className="text-xs text-gray-400">
                        Display prominently on homepage
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

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" type="button" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-white"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update Collection"
                  : "Create Collection"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

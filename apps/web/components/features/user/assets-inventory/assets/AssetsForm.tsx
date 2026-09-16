"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  useAssetCategories,
  useAssetDepreciationSchedule,
  useCreateAsset,
  useUpdateAsset,
} from "@/lib/api/hooks/useAssets";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { assetsSchema } from "./utils/schema";
import { formatDate, toDateInput } from "./utils/format";

type AssetFormData = z.infer<typeof assetsSchema>;

interface AssetsFormProps {
  assets?: any;
  isEditMode?: boolean;
}

export default function AssetsForm({ assets, isEditMode = false }: AssetsFormProps) {
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const { closeModal } = useModal();
  const sym = useEntityCurrencySymbol();

  const { data: categoriesRes, isLoading: categoriesLoading } = useAssetCategories();
  const categories = categoriesRes?.data ?? [];
  // Shared cache with the categories view; only needed for the fiscal year start
  const { data: scheduleRes } = useAssetDepreciationSchedule();
  const fiscalYearStart = scheduleRes?.data?.fiscalYear?.start;

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetsSchema),
    defaultValues: {
      name: assets?.name ?? "",
      categoryId: assets?.categoryId ?? "",
      status: assets?.status === "in_storage" ? "in_storage" : "in_use",
      purchaseCost: assets?.purchaseCost ?? undefined,
      purchaseDate: toDateInput(assets?.purchaseDate),
      openingAccumulatedDepreciation: assets?.openingAccumulatedDepreciation ?? undefined,
    },
  });

  const purchaseDate = form.watch("purchaseDate");
  // Carried-over depreciation only applies to assets bought before this fiscal year
  const isPriorYearAsset =
    !!purchaseDate && !!fiscalYearStart && purchaseDate < toDateInput(fiscalYearStart);

  const isPending = createAsset.isPending || updateAsset.isPending;
  const modalKey = isEditMode ? `${MODAL.ASSET_EDIT}-${assets?.id}` : MODAL.ASSET_CREATE;

  const onSubmit = (values: AssetFormData) => {
    const payload = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      status: values.status,
      purchaseCost: Math.round(values.purchaseCost!),
      purchaseDate: new Date(values.purchaseDate).toISOString(),
      openingAccumulatedDepreciation:
        isPriorYearAsset && values.openingAccumulatedDepreciation !== undefined
          ? Math.round(values.openingAccumulatedDepreciation)
          : null,
    };
    if (isEditMode && assets?.id) {
      updateAsset.mutate({ id: assets.id, data: payload });
    } else {
      createAsset.mutate(payload);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">
                Asset Name <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Toyota Hilux 2024 or Perkins Generator" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">
                  Asset Category <span className="text-red-500">*</span>
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={categoriesLoading ? "Loading..." : "Select category"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.depreciationRate}%)
                      </SelectItem>
                    ))}
                    {!categoriesLoading && categories.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No categories yet — add one under Asset Categories
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">
                  {isEditMode ? "Status" : "Initial Status"}
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="in_storage">In Storage</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purchaseCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">
                  Purchase Cost ({sym}) <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <NumberInput
                    placeholder="e.g. 15,000,000"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">
                  Purchase Date <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isPriorYearAsset && (
          <FormField
            control={form.control}
            name="openingAccumulatedDepreciation"
            render={({ field }) => (
              <FormItem className="rounded-lg border bg-muted/40 p-3">
                <FormLabel className="font-semibold">
                  Opening Accumulated Depreciation ({sym})
                </FormLabel>
                <FormControl>
                  <NumberInput
                    placeholder="Optional"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Depreciation already charged on this asset up to{" "}
                  {formatDate(fiscalYearStart)} in your previous books. Leave blank to
                  calculate it from the purchase date and category rate.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => closeModal(modalKey)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Please wait
              </>
            ) : isEditMode ? (
              "Update Asset"
            ) : (
              "Save Asset"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

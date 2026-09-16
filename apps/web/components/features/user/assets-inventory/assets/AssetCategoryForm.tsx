"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
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
  useCreateAssetCategory,
  useUpdateAssetCategory,
} from "@/lib/api/hooks/useAssets";
import type { AssetCategory } from "@/lib/api/services/assetsService";
import { assetCategorySchema } from "./utils/schema";

type FormValues = z.infer<typeof assetCategorySchema>;

export default function AssetCategoryForm({ category }: { category?: AssetCategory }) {
  const isEdit = !!category;
  const create = useCreateAssetCategory();
  const update = useUpdateAssetCategory();

  const form = useForm<FormValues>({
    resolver: zodResolver(assetCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      depreciationRate: category?.depreciationRate ?? undefined,
      description: category?.description ?? "",
    },
  });

  const rate = form.watch("depreciationRate");
  const rateChanged = isEdit && rate !== undefined && rate !== category.depreciationRate;
  const isPending = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    const payload = {
      name: values.name.trim(),
      depreciationRate: values.depreciationRate!,
      description: values.description || undefined,
    };
    if (isEdit) update.mutate({ id: category.id, data: payload });
    else create.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">
                Category Name <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input className="rounded-2xl" placeholder="e.g. Motor vehicle" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="depreciationRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">
                Annual Depreciation Rate (%) <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <NumberInput className="rounded-2xl" placeholder="e.g. 20" value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormDescription>
                Straight-line on cost, full year&apos;s charge in the year of purchase.
              </FormDescription>
              {rateChanged && category.assetCount > 0 && (
                <p className="text-sm text-amber-700">
                  This recalculates depreciation for all {category.assetCount} asset(s) in
                  this category, including prior years.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Description</FormLabel>
              <FormControl>
                <Textarea className="rounded-2xl" rows={2} placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Please wait
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Add Category"
          )}
        </Button>
      </form>
    </Form>
  );
}

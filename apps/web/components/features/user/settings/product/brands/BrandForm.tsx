"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  useCreateProductBrand,
  useUpdateProductBrand,
} from "@/lib/api/hooks/useSettings";
import { ProductBrand } from "./BrandColumn";

const schema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  brand?: ProductBrand;
  onSuccess?: () => void;
}

export default function BrandForm({ brand, onSuccess }: Props) {
  const isEdit = !!brand;
  const create = useCreateProductBrand();
  const update = useUpdateProductBrand();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: brand?.name ?? "",
      description: brand?.description ?? "",
    },
  });

  const isPending = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      update.mutate({ id: brand.id, payload: values }, { onSuccess });
    } else {
      create.mutate(values, { onSuccess });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Samsung, Nike, Apple" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of this brand"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Add Brand"
          )}
        </Button>
      </form>
    </Form>
  );
}

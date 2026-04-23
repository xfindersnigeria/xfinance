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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useCreateProductCategory,
  useUpdateProductCategory,
} from "@/lib/api/hooks/useSettings";
import { ProductCategory } from "./CategoryColumn";

const schema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  category?: ProductCategory;
  onSuccess?: () => void;
}

const colorOptions = [
  { value: "blue", label: "Blue", className: "bg-blue-100 text-blue-700" },
  { value: "green", label: "Green", className: "bg-green-100 text-green-700" },
  { value: "purple", label: "Purple", className: "bg-purple-100 text-purple-700" },
  { value: "orange", label: "Orange", className: "bg-orange-100 text-orange-700" },
  { value: "indigo", label: "Indigo", className: "bg-indigo-100 text-indigo-700" },
  { value: "red", label: "Red", className: "bg-red-100 text-red-700" },
  { value: "yellow", label: "Yellow", className: "bg-yellow-100 text-yellow-700" },
  { value: "pink", label: "Pink", className: "bg-pink-100 text-pink-700" },
  { value: "teal", label: "Teal", className: "bg-teal-100 text-teal-700" },
  { value: "gray", label: "Gray", className: "bg-gray-100 text-gray-700" },
];

export default function CategoryForm({ category, onSuccess }: Props) {
  const isEdit = !!category;
  const create = useCreateProductCategory();
  const update = useUpdateProductCategory();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? "",
      color: category?.color ?? "",
      description: category?.description ?? "",
    },
  });

  const isPending = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      update.mutate({ id: category.id, payload: values }, { onSuccess });
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
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Electronics, Services" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a color" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {colorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block w-4 h-4 rounded-full",
                            opt.className
                          )}
                        />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  placeholder="Brief description of this category"
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
            "Add Category"
          )}
        </Button>
      </form>
    </Form>
  );
}

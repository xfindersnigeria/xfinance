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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateProductUnit,
  useUpdateProductUnit,
} from "@/lib/api/hooks/useSettings";
import { ProductUnit } from "./UnitColumn";

const schema = z.object({
  name: z.string().min(1, "Unit name is required"),
  abbreviation: z.string().min(1, "Abbreviation is required"),
  type: z.string().min(1, "Type is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  unit?: ProductUnit;
  onSuccess?: () => void;
}

const unitTypes = [
  "Quantity",
  "Weight",
  "Volume",
  "Length",
  "Packaging",
  "Time",
  "Service",
  "Area",
];

export default function UnitForm({ unit, onSuccess }: Props) {
  const isEdit = !!unit;
  const create = useCreateProductUnit();
  const update = useUpdateProductUnit();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: unit?.name ?? "",
      abbreviation: unit?.abbreviation ?? "",
      type: unit?.type ?? "",
    },
  });

  const isPending = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      update.mutate({ id: unit.id, payload: values }, { onSuccess });
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
              <FormLabel>Unit Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Kilogram, Piece, Liter" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="abbreviation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abbreviation</FormLabel>
              <FormControl>
                <Input placeholder="e.g., kg, pcs, L" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unitTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            "Add Unit"
          )}
        </Button>
      </form>
    </Form>
  );
}

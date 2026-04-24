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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCreateCurrency, useUpdateCurrency } from "@/lib/api/hooks/useSettings";
import { GroupCurrencyRow } from "./CurrencyColumn";
import CurrencyPicker from "@/components/local/shared/CurrencyPicker";
import { CurrencyOption } from "@/lib/utils/currencies";

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1, "Currency name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  exchangeRate: z.coerce.number().positive("Must be a positive number").optional(),
});

const editSchema = z.object({
  name: z.string().min(1, "Currency name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  exchangeRate: z.coerce.number().positive("Must be a positive number").optional(),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

interface CurrencyFormProps {
  currency?: GroupCurrencyRow;
  onSuccess?: () => void;
}

export default function CurrencyForm({ currency, onSuccess }: CurrencyFormProps) {
  const isEdit = !!currency;
  const createCurrency = useCreateCurrency();
  const updateCurrency = useUpdateCurrency();

  const form = useForm<CreateValues | EditValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema) as any,
    defaultValues: isEdit
      ? { name: currency.name, symbol: currency.symbol, exchangeRate: currency.exchangeRate }
      : { code: "", name: "", symbol: "", exchangeRate: undefined },
  });

  const isPending = createCurrency.isPending || updateCurrency.isPending;
  const isPrimary = currency?.isPrimary ?? false;

  const handleCurrencySelect = (option: CurrencyOption) => {
    (form as any).setValue("code", option.code);
    (form as any).setValue("name", option.name);
    (form as any).setValue("symbol", option.symbol);
  };

  const onSubmit = (values: any) => {
    if (isEdit && currency) {
      updateCurrency.mutate({ id: currency.id, payload: values }, { onSuccess });
    } else {
      createCurrency.mutate(values, { onSuccess });
    }
  };

  const selectedCode = (form as any).watch?.("code") || "";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        {!isEdit && (
          <FormItem>
            <FormLabel>Currency</FormLabel>
            <CurrencyPicker
              value={selectedCode}
              onChange={handleCurrencySelect}
              placeholder="Search and select a currency"
            />
            {/* <FormDescription className="text-xs">
              Selecting a currency auto-fills the name and symbol
            </FormDescription> */}
          </FormItem>
        )}

        {isEdit && (
          <div className="text-sm font-mono bg-gray-50 rounded px-3 py-2 text-gray-700">
            {currency.code}
          </div>
        )}

        {/* <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. US Dollar" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        {/* <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Symbol</FormLabel>
              <FormControl>
                <Input placeholder="e.g. $" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        {!isPrimary && (
          <FormField
            control={form.control}
            name="exchangeRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exchange Rate</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 1650"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  How many units of this currency equal 1 unit of the primary currency
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isPrimary && (
          <p className="text-xs text-indigo-600 bg-indigo-50 rounded p-2">
            Primary currency always has exchange rate 1.00
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Saving..." : "Adding..."}
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Add Currency"
          )}
        </Button>
      </form>
    </Form>
  );
}

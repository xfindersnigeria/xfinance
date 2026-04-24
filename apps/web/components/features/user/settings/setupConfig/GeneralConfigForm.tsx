"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import {
  useCurrencies,
  useEntityConfig,
  useUpdateEntityConfig,
} from "@/lib/api/hooks/useSettings";
import CurrencyPicker from "@/components/local/shared/CurrencyPicker";
import { CurrencyOption } from "@/lib/utils/currencies";

const generalConfigSchema = z.object({
  baseCurrency: z.string().min(1, "Base currency is required"),
  multiCurrency: z.boolean().default(false),
  dateFormat: z.string().min(1, "Date format is required"),
  numberFormat: z.string().min(1, "Number format is required"),
});

type GeneralConfigFormData = z.infer<typeof generalConfigSchema>;

interface GeneralConfigFormProps {
  onSuccess?: () => void;
}

const DATE_FORMATS = [
  { id: "DD/MM/YYYY",    label: "DD/MM/YYYY",    example: "24/04/2026" },
  { id: "MM/DD/YYYY",    label: "MM/DD/YYYY",    example: "04/24/2026" },
  { id: "YYYY-MM-DD",    label: "YYYY-MM-DD",    example: "2026-04-24" },
  { id: "DD-MM-YYYY",    label: "DD-MM-YYYY",    example: "24-04-2026" },
  { id: "DD MMM YYYY",   label: "DD MMM YYYY",   example: "24 Apr 2026" },
  { id: "MMM DD, YYYY",  label: "MMM DD, YYYY",  example: "Apr 24, 2026" },
  { id: "MMMM DD, YYYY", label: "MMMM DD, YYYY", example: "April 24, 2026" },
];

const NUMBER_FORMATS = [
  { id: "1,234.56", label: "1,234.56",  example: "comma thousands, dot decimal (US/UK)" },
  { id: "1.234,56", label: "1.234,56",  example: "dot thousands, comma decimal (EU)" },
  { id: "1 234.56", label: "1 234.56",  example: "space thousands, dot decimal (FR/CH)" },
  { id: "1234.56",  label: "1234.56",   example: "no thousands separator" },
];

export default function GeneralConfigForm({ onSuccess }: GeneralConfigFormProps) {
  const { data: currencyRes } = useCurrencies(true);
  const activeCurrencies: any[] = (currencyRes as any)?.data ?? [];

  const { data: configRes, isLoading: configLoading } = useEntityConfig();
  const config: any = (configRes as any)?.data ?? {};

  const updateConfig = useUpdateEntityConfig();

  const form = useForm<GeneralConfigFormData>({
    resolver: zodResolver(generalConfigSchema) as any,
    defaultValues: {
      baseCurrency: "",
      multiCurrency: false,
      dateFormat: "MM/DD/YYYY",
      numberFormat: "1,234.56",
    },
  });

  useEffect(() => {
    if (config && !configLoading) {
      form.reset({
        baseCurrency: config.baseCurrency ?? "",
        multiCurrency: config.multiCurrency ?? false,
        dateFormat: config.dateFormat ?? "MM/DD/YYYY",
        numberFormat: config.numberFormat ?? "1,234.56",
      });
    }
  }, [config, configLoading]);

  const onSubmit = (values: GeneralConfigFormData) => {
    updateConfig.mutate(
      {
        baseCurrency: values.baseCurrency,
        multiCurrency: values.multiCurrency,
        dateFormat: values.dateFormat,
        numberFormat: values.numberFormat,
      },
      { onSuccess },
    );
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">General Configuration</h2>
        <p className="text-sm text-gray-600 mt-1">Manage entity-level settings and formats</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">

            {/* Base Currency */}
            <div className="flex items-start justify-between gap-6 pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Base Currency
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Default currency for this entity (from group active currencies)
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem className="">
                    <CurrencyPicker
                      value={field.value}
                      onChange={(c: CurrencyOption) => field.onChange(c.code)}
                      placeholder="Select base currency"
                      disabled={activeCurrencies.length === 0}
                      options={activeCurrencies.map((c: any) => ({
                        code: c.code,
                        name: c.name,
                        symbol: c.symbol,
                      }))}
                    />
                    {activeCurrencies.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No active currencies — add them in group settings first
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Multi-Currency — disabled until feature is enabled */}
            <div className="flex items-center justify-between pb-6 border-b opacity-60">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Multi-Currency
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Enable transactions in multiple currencies (coming soon)
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="multiCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Date Format */}
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Date Format
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Display format for dates across this entity
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <FormItem className="">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DATE_FORMATS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span className="font-mono">{f.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({f.example})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Number Format */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <FormLabel className="text-base font-semibold text-gray-900">
                  Number Format
                </FormLabel>
                <FormDescription className="text-sm text-gray-600 mt-1">
                  Display format for monetary values
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="numberFormat"
                render={({ field }) => (
                  <FormItem className="">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="">
                        {NUMBER_FORMATS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span className="font-mono">{f.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">— {f.example}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateConfig.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-6 font-semibold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updateConfig.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

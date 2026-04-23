'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Calendar,
  DollarSign,
  FileText,
  Info,
  Plus,
  Trash2,
  TrendingUp,
  Sparkles,
  BarChart2,
  PenLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAccounts } from '@/lib/api/hooks/useAccounts';
import type { Account } from '@/lib/api/hooks/types/accountsTypes';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUARTERS = [
  'Q1 2025 (Jan-Mar)', 'Q2 2025 (Apr-Jun)', 'Q3 2025 (Jul-Sep)', 'Q4 2025 (Oct-Dec)',
  'Q1 2026 (Jan-Mar)', 'Q2 2026 (Apr-Jun)', 'Q3 2026 (Jul-Sep)', 'Q4 2026 (Oct-Dec)',
];

const FISCAL_YEARS = ['FY 2023', 'FY 2024', 'FY 2025', 'FY 2026'];

const CONFIDENCE_LEVELS = ['High Confidence', 'Medium Confidence', 'Low Confidence', 'Speculative'];

const PERIOD_TYPES = ['Monthly', 'Quarterly', 'Yearly'];

const CATEGORY_BADGE: Record<string, string> = {
  Revenue: 'bg-green-100 text-green-800',
  Expense: 'bg-orange-100 text-orange-800',
  Asset: 'bg-blue-100 text-blue-800',
  Liability: 'bg-yellow-100 text-yellow-800',
  Equity: 'bg-purple-100 text-purple-800',
};

type ForecastMethod = 'manual' | 'growth_rate' | 'ai';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  periodType: z.string().min(1),
  quarter: z.string().min(1, 'Quarter is required'),
  fiscalYear: z.string().min(1, 'Fiscal year is required'),
  name: z.string().optional(),
  confidenceLevel: z.string().min(1),
  note: z.string().optional(),
  lines: z.array(
    z.object({
      accountId: z.string().min(1, 'Account is required'),
      amount: z.number().min(0, 'Amount must be non-negative'),
    })
  ).min(1, 'Add at least one forecast line'),
});

type FormValues = z.infer<typeof schema>;

// ─── Method card ─────────────────────────────────────────────────────────────

interface MethodCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: ForecastMethod;
  selected: boolean;
  onSelect: () => void;
}

function MethodCard({ icon, title, description, value, selected, onSelect }: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
        selected
          ? 'border-purple-400 bg-purple-50'
          : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/30'
      }`}
    >
      <div
        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
          selected ? 'border-purple-600' : 'border-gray-300'
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-purple-600" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          {title} {icon}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateForecastForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [method, setMethod] = useState<ForecastMethod>('manual');

  const { data: accountsResponse, isLoading: accountsLoading } = useAccounts({ limit: 200 });
  const accounts: Account[] = useMemo(
    () => (accountsResponse as any)?.data ?? [],
    [accountsResponse]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodType: 'Quarterly',
      quarter: 'Q1 2026 (Jan-Mar)',
      fiscalYear: 'FY 2026',
      name: '',
      confidenceLevel: 'Medium Confidence',
      note: '',
      lines: [{ accountId: '', amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const watchedLines = form.watch('lines');

  const totalForecast = useMemo(
    () => watchedLines.reduce((sum, l) => sum + (l.amount || 0), 0),
    [watchedLines]
  );

  const getAccountCategory = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    return acc?.categoryName ?? acc?.typeName ?? '';
  };

  // Placeholder — replaced with real last-period actuals once API is available
  const getLastPeriodActual = (_accountId: string) => '₦285,000,000';

  const onSubmit = async (_values: FormValues) => {
    try {
      setIsSubmitting(true);
      // No create forecast API hook yet — wire when backend is ready
      await new Promise((r) => setTimeout(r, 800));
      toast.success('Group forecast created successfully');
      router.push('/budgeting-and-forecasts/forecast');
    } catch {
      toast.error('Failed to create forecast');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl mx-auto py-6">

          {/* ── Forecast Period ── */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-gray-800">Forecast Period</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="periodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Period Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIOD_TYPES.map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
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
                name="quarter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quarter <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUARTERS.map((q) => (
                            <SelectItem key={q} value={q}>{q}</SelectItem>
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
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Fiscal Year <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FISCAL_YEARS.map((fy) => (
                            <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forecast Name (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 'Q1 2026 Growth Projection', 'Conservative Forecast'"
                        className="bg-white"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confidenceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence Level</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONFIDENCE_LEVELS.map((cl) => (
                            <SelectItem key={cl} value={cl}>{cl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Forecast Method ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-gray-800">Forecast Method</span>
            </div>
            <div className="space-y-2">
              <MethodCard
                value="manual"
                selected={method === 'manual'}
                onSelect={() => setMethod('manual')}
                icon={<PenLine className="w-3.5 h-3.5 text-gray-500" />}
                title="Manual Entry"
                description="Enter forecast values manually for each account"
              />
              <MethodCard
                value="growth_rate"
                selected={method === 'growth_rate'}
                onSelect={() => setMethod('growth_rate')}
                icon={<TrendingUp className="w-3.5 h-3.5 text-gray-500" />}
                title="Growth Rate Based"
                description="Apply growth rates to historical data to project future values"
              />
              <MethodCard
                value="ai"
                selected={method === 'ai'}
                onSelect={() => setMethod('ai')}
                icon={<Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                title="AI-Powered Forecast"
                description="Auto-generate forecast using historical trends and patterns"
              />
            </div>
          </div>

          {/* ── Forecast Lines ── */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-800">Forecast Lines</span>
              </div>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => append({ accountId: '', amount: 0 })}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line
              </Button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100">
              {['Account', 'Type', 'Forecast Amount (₦)', 'Last Period Actual', ''].map((h) => (
                <span key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </span>
              ))}
            </div>

            <div className="divide-y divide-gray-50">
              {fields.map((field, i) => {
                const accountId = watchedLines[i]?.accountId ?? '';
                const category = getAccountCategory(accountId);
                const badgeClass = CATEGORY_BADGE[category] ?? 'bg-gray-100 text-gray-700';

                return (
                  <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-3">
                    <FormField
                      control={form.control}
                      name={`lines.${i}.accountId`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <FormControl>
                            <Select
                              onValueChange={f.onChange}
                              value={f.value}
                              disabled={accountsLoading}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder={accountsLoading ? 'Loading...' : 'Select account'} />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {accounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                    {acc.code} - {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center">
                      {category ? (
                        <Badge className={`${badgeClass} text-xs font-medium px-2`}>{category}</Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name={`lines.${i}.amount`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₦</span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="pl-6 h-9 text-xs"
                                placeholder="0.00"
                                {...f}
                                onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <span className="text-xs text-gray-500">
                      {accountId ? getLastPeriodActual(accountId) : '—'}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                      onClick={() => fields.length > 1 && remove(i)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Total footer */}
            <div className="flex items-center justify-between px-5 py-4 bg-purple-50/30 border-t border-purple-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Forecast Value</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₦{totalForecast.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Forecast Lines</p>
                <p className="text-sm font-medium text-gray-700">
                  {fields.length} account{fields.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* ── Notes & Assumptions ── */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">Notes & Assumptions</span>
            </div>
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">
                    Forecast Notes & Key Assumptions (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Document your forecast assumptions, market conditions, planned initiatives, or any factors influencing these projections..."
                      className="bg-white resize-none h-24 text-sm"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* ── Best practices ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Forecast Best Practices</span>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-600 list-disc list-inside">
              <li>Base forecasts on historical trends, market research, and business strategy</li>
              <li>Consider multiple scenarios (conservative, moderate, aggressive) when planning</li>
              <li>Review and update forecasts regularly as new data becomes available</li>
              <li>Document all assumptions to help future reviews and variance analysis</li>
              <li>Compare forecasts against actuals to improve future prediction accuracy</li>
            </ul>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between pt-2 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/budgeting-and-forecasts/forecast')}
            >
              Cancel
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.info('Saved as draft')}
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                {isSubmitting ? 'Creating...' : 'Create Forecast'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}

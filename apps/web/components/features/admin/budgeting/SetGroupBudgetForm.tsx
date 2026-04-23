'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  DollarSign,
  FileText,
  Info,
  Plus,
  Trash2,
  Copy,
  FileDown,
  TrendingUp,
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
import { useCreateBudget } from '@/lib/api/hooks/useAccounts';
import { BudgetPeriodTypeEnum } from '@/lib/api/hooks/types/accountsTypes';
import type { Account } from '@/lib/api/hooks/types/accountsTypes';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January 2025', 'February 2025', 'March 2025', 'April 2025',
  'May 2025', 'June 2025', 'July 2025', 'August 2025',
  'September 2025', 'October 2025', 'November 2025', 'December 2025',
  'January 2026', 'February 2026', 'March 2026',
];

const FISCAL_YEARS = ['FY 2023', 'FY 2024', 'FY 2025', 'FY 2026'];

const CATEGORY_BADGE: Record<string, string> = {
  Revenue: 'bg-green-100 text-green-800',
  Expense: 'bg-orange-100 text-orange-800',
  Asset: 'bg-blue-100 text-blue-800',
  Liability: 'bg-yellow-100 text-yellow-800',
  Equity: 'bg-purple-100 text-purple-800',
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  periodType: z.nativeEnum(BudgetPeriodTypeEnum),
  month: z.string().min(1, 'Month is required'),
  fiscalYear: z.string().min(1, 'Fiscal year is required'),
  name: z.string().optional(),
  note: z.string().optional(),
  lines: z.array(
    z.object({
      accountId: z.string().min(1, 'Account is required'),
      amount: z.number().min(0, 'Amount must be non-negative'),
    })
  ).min(1, 'Add at least one budget line'),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

export function SetGroupBudgetForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: accountsResponse, isLoading: accountsLoading } = useAccounts({ limit: 200 });
  const accounts: Account[] = useMemo(
    () => (accountsResponse as any)?.data ?? [],
    [accountsResponse]
  );

  const createBudget = useCreateBudget();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodType: BudgetPeriodTypeEnum.Monthly,
      month: 'November 2025',
      fiscalYear: 'FY 2025',
      name: '',
      note: '',
      lines: [{ accountId: '', amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const watchedLines = form.watch('lines');

  const totalBudget = useMemo(
    () => watchedLines.reduce((sum, l) => sum + (l.amount || 0), 0),
    [watchedLines]
  );

  const getAccountLabel = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return '';
    return `${acc.code} - ${acc.name}`;
  };

  const getAccountCategory = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    return acc?.categoryName ?? acc?.typeName ?? '';
  };

  // Last period placeholder — replaced with real data once GET budgets API exists
  const getLastPeriod = (_accountId: string) => '₦275,000,000';

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      await createBudget.mutateAsync({
        name: values.name || `${values.periodType} Budget - ${values.month}`,
        periodType: values.periodType,
        month: values.month,
        fiscalYear: values.fiscalYear,
        note: values.note,
        lines: values.lines,
      });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Group budget created successfully');
      router.push('/budgeting-and-forecasts/budget-overview');
    } catch {
      // error toast handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAsDraft = () => {
    toast.info('Saved as draft');
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl mx-auto py-6">

          {/* ── Budget Period ── */}
          <div className="rounded-xl border border-green-100 bg-green-50/40 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-gray-800">Budget Period</span>
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
                          {Object.values(BudgetPeriodTypeEnum).map((v) => (
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
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Month <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
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

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 'Q4 Group Growth Budget', 'FY2026 Consolidated Plan'"
                      className="bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ── Quick actions ── */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => toast.info('Copy from previous period coming soon')}
            >
              <Copy className="w-3.5 h-3.5" />
              Copy from Previous Period
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => toast.info('Import from template coming soon')}
            >
              <FileDown className="w-3.5 h-3.5" />
              Import from Template
            </Button>
          </div>

          {/* ── Budget Lines ── */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-800">Consolidated Budget Lines</span>
              </div>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                onClick={() => append({ accountId: '', amount: 0 })}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line
              </Button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100">
              {['Account', 'Type', 'Budget Amount (₦)', 'Last Period', ''].map((h) => (
                <span key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </span>
              ))}
            </div>

            {/* Lines */}
            <div className="divide-y divide-gray-50">
              {fields.map((field, i) => {
                const accountId = watchedLines[i]?.accountId ?? '';
                const category = getAccountCategory(accountId);
                const badgeClass = CATEGORY_BADGE[category] ?? 'bg-gray-100 text-gray-700';

                return (
                  <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-3">
                    {/* Account */}
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

                    {/* Type badge */}
                    <div className="flex items-center">
                      {category ? (
                        <Badge className={`${badgeClass} text-xs font-medium px-2`}>{category}</Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    {/* Amount */}
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

                    {/* Last period */}
                    <span className="text-xs text-gray-500">
                      {accountId ? getLastPeriod(accountId) : '—'}
                    </span>

                    {/* Remove */}
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
            <div className="flex items-center justify-between px-5 py-4 bg-green-50/30 border-t border-green-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Consolidated Budget</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₦{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Budget Lines</p>
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
                  <FormLabel className="text-xs text-gray-600">Budget Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes, assumptions, or context about this consolidated group budget..."
                      className="bg-white resize-none h-24 text-sm"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* ── Tips box ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Group Budget Tips</span>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-600 list-disc list-inside">
              <li>This consolidated budget applies to all entities in the group</li>
              <li>Review historical consolidated data from &quot;Last Period&quot; to inform your budget</li>
              <li>Set realistic targets based on group-wide business goals and market conditions</li>
              <li>Use Group Budget vs Actual reports to track consolidated performance</li>
            </ul>
          </div>

          {/* ── Footer actions ── */}
          <div className="flex items-center justify-between pt-2 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/budgeting-and-forecasts/budget-overview')}
            >
              Cancel
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleSaveAsDraft}>
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {isSubmitting ? 'Creating...' : 'Set Group Budget'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}

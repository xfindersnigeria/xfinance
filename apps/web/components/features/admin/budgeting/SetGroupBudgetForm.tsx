'use client';

import React, { useMemo, useRef, useState } from 'react';
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
import {
  useCreateGroupBudget,
  useGroupPreviousPeriodBudget,
} from '@/lib/api/hooks/useAccounts';
import { useGroupCurrencySymbol } from '@/lib/api/hooks/useCurrencyFormat';
import { BudgetPeriodTypeEnum } from '@/lib/api/hooks/types/accountsTypes';
import type { Account } from '@/lib/api/hooks/types/accountsTypes';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Jan–Mar)' },
  { value: 'Q2', label: 'Q2 (Apr–Jun)' },
  { value: 'Q3', label: 'Q3 (Jul–Sep)' },
  { value: 'Q4', label: 'Q4 (Oct–Dec)' },
];

const FISCAL_YEARS = ['2023', '2024', '2025', '2026', '2027'];

const CATEGORY_BADGE: Record<string, string> = {
  Revenue: 'bg-green-100 text-green-800',
  Expense: 'bg-orange-100 text-orange-800',
  Asset: 'bg-blue-100 text-primary',
  Liability: 'bg-yellow-100 text-yellow-800',
  Equity: 'bg-purple-100 text-purple-800',
};

function currentMonth() {
  return MONTHS[new Date().getMonth()];
}

function currentYear() {
  return String(new Date().getFullYear());
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const budgetLineSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  budgetAmount: z.string().min(1, 'Amount is required'),
});

const schema = z
  .object({
    periodType: z.nativeEnum(BudgetPeriodTypeEnum),
    period: z.string().optional(),
    fiscalYear: z.string().min(1, 'Fiscal year is required'),
    name: z.string().optional(),
    note: z.string().optional(),
    lines: z.array(budgetLineSchema).min(1, 'Add at least one budget line'),
  })
  .superRefine((data, ctx) => {
    if (
      (data.periodType === BudgetPeriodTypeEnum.Monthly ||
        data.periodType === BudgetPeriodTypeEnum.Quarterly) &&
      !data.period
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Period is required',
        path: ['period'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

export function SetGroupBudgetForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sym = useGroupCurrencySymbol();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { data: accountsResponse, isLoading: accountsLoading } = useAccounts({ limit: 200 });
  const accounts: Account[] = useMemo(
    () => (accountsResponse as any)?.data ?? [],
    [accountsResponse],
  );

  const createGroupBudget = useCreateGroupBudget();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodType: BudgetPeriodTypeEnum.Monthly,
      period: currentMonth(),
      fiscalYear: currentYear(),
      name: '',
      note: '',
      lines: [{ accountId: '', budgetAmount: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const watchedLines = form.watch('lines');
  const watchedPeriodType = form.watch('periodType');
  const watchedPeriod = form.watch('period') ?? '';
  const watchedFiscalYear = form.watch('fiscalYear');

  // Previous period data for "Last Period" column and Copy action
  const { data: prevPeriodData } = useGroupPreviousPeriodBudget(
    { periodType: watchedPeriodType, period: watchedPeriod, fiscalYear: watchedFiscalYear },
    !!(watchedPeriodType && watchedFiscalYear),
  );

  const prevPeriodMap = useMemo(() => {
    const m = new Map<string, number>();
    prevPeriodData?.lines?.forEach((l) => m.set(l.accountId, l.amount));
    return m;
  }, [prevPeriodData]);

  const totalBudget = useMemo(
    () =>
      watchedLines.reduce(
        (sum, l) => sum + (parseFloat(l.budgetAmount) || 0),
        0,
      ),
    [watchedLines],
  );

  const getAccount = (id: string) => accounts.find((a) => a.id === id);
  const getAccountCategory = (id: string) =>
    getAccount(id)?.categoryName ?? getAccount(id)?.typeName ?? '';

  const handlePeriodTypeChange = (v: BudgetPeriodTypeEnum) => {
    form.setValue('periodType', v);
    if (v === BudgetPeriodTypeEnum.Monthly) form.setValue('period', currentMonth());
    else if (v === BudgetPeriodTypeEnum.Quarterly) form.setValue('period', 'Q1');
    else form.setValue('period', undefined);
  };

  const handleCopyFromPreviousPeriod = () => {
    if (!prevPeriodData?.lines?.length) {
      toast.info('No budget found for the previous period');
      return;
    }
    const newLines = prevPeriodData.lines.map((l) => ({
      accountId: l.accountId,
      budgetAmount: String(l.amount),
    }));
    form.setValue('lines', newLines);
    toast.success(`Copied ${newLines.length} lines from previous period`);
  };

  const handleDownloadTemplate = () => {
    if (!accounts.length) {
      toast.info('Accounts are still loading');
      return;
    }
    const header = 'AccountCode,AccountName,BudgetAmount';
    const rows = accounts
      .map((a) => `${a.code},${a.name},0`)
      .join('\n');
    const csv = `${header}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'group_budget_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        toast.error('CSV is empty or has no data rows');
        return;
      }

      const header = lines[0].toLowerCase();
      if (!header.includes('accountcode') && !header.includes('account')) {
        toast.error('CSV must have AccountCode column');
        return;
      }

      const parsed: { accountId: string; budgetAmount: string }[] = [];
      let skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const code = cols[0]?.trim();
        const amount = cols[2]?.trim() ?? cols[1]?.trim() ?? '0';

        const account = accounts.find((a) => a.code === code);
        if (!account) {
          skipped++;
          continue;
        }

        const numAmount = parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0;
        parsed.push({ accountId: account.id, budgetAmount: String(numAmount) });
      }

      if (!parsed.length) {
        toast.error('No matching accounts found in CSV');
        return;
      }

      form.setValue('lines', parsed);
      if (skipped > 0) {
        toast.success(`Imported ${parsed.length} lines (${skipped} unmatched codes skipped)`);
      } else {
        toast.success(`Imported ${parsed.length} lines`);
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const period =
        values.periodType === BudgetPeriodTypeEnum.Yearly
          ? values.fiscalYear
          : values.period ?? '';

      await createGroupBudget.mutateAsync({
        name: values.name || `${values.periodType} Group Budget – ${period} ${values.fiscalYear}`,
        periodType: values.periodType,
        month: period,
        fiscalYear: values.fiscalYear,
        note: values.note,
        lines: values.lines.map((l) => ({
          accountId: l.accountId,
          amount: Math.round(parseFloat(l.budgetAmount) * 100),
        })),
      });
      queryClient.invalidateQueries({ queryKey: ['groupBudgets'] });
      router.push('/budgeting-and-forecasts/budget-overview');
    } catch {
      // error toast handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-3">

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
                    <FormLabel>Period Type <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(v) => handlePeriodTypeChange(v as BudgetPeriodTypeEnum)}
                        value={field.value}
                      >
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[BudgetPeriodTypeEnum.Monthly, BudgetPeriodTypeEnum.Quarterly, BudgetPeriodTypeEnum.Yearly].map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedPeriodType === BudgetPeriodTypeEnum.Monthly && (
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="bg-white w-full">
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
              )}

              {watchedPeriodType === BudgetPeriodTypeEnum.Quarterly && (
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quarter <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="bg-white w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUARTERS.map((q) => (
                              <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FISCAL_YEARS.map((fy) => (
                            <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
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
              onClick={handleCopyFromPreviousPeriod}
            >
              <Copy className="w-3.5 h-3.5" />
              Copy from Previous Period
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => csvInputRef.current?.click()}
            >
              <FileDown className="w-3.5 h-3.5" />
              Import from Template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-xs text-gray-500"
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
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
                onClick={() => append({ accountId: '', budgetAmount: '' })}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line
              </Button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100">
              {['Account', 'Type', `Budget Amount (${sym})`, 'Last Period', ''].map((h) => (
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
                const lastPeriodAmt = prevPeriodMap.get(accountId);

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
                              <SelectTrigger className="h-9 text-xs w-full">
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
                      name={`lines.${i}.budgetAmount`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{sym}</span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="pl-6 h-9 text-xs"
                                placeholder="0.00"
                                {...f}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Last period */}
                    <span className="text-xs text-gray-500">
                      {accountId && lastPeriodAmt !== undefined
                        ? `${sym}${lastPeriodAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : '—'}
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
                    {sym}{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              <Button type="button" variant="outline" onClick={() => toast.info('Saved as draft')}>
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

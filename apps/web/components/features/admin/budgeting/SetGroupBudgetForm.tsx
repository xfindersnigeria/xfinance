'use client';

import React, { useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Calendar,
  DollarSign,
  FileText,
  Plus,
  Trash2,
  Copy,
  FileDown,
  TrendingUp,
  Loader2,
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
import {
  useCreateGroupBudget,
  useUpdateGroupBudget,
  useGroupBudgetSubCategories,
  useGroupPreviousPeriodBudget,
} from '@/lib/api/hooks/useAccounts';
import { useGroupCurrencySymbol } from '@/lib/api/hooks/useCurrencyFormat';
import { BudgetPeriodTypeEnum } from '@/lib/api/hooks/types/accountsTypes';
import type { BudgetHeaderDetail } from '@/lib/api/hooks/types/accountsTypes';
import { MONTHS, QUARTERS, getFiscalYears } from '@/lib/period-utils';

const FISCAL_YEARS = getFiscalYears().map(String);

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

const lineSchema = z.object({
  subCategoryId: z.string().min(1, 'Sub-category is required'),
  budgetAmount: z.string().min(1, 'Amount is required'),
});

const schema = z
  .object({
    periodType: z.nativeEnum(BudgetPeriodTypeEnum),
    period: z.string().optional(),
    fiscalYear: z.string().min(1, 'Fiscal year is required'),
    name: z.string().min(1, 'Budget name is required'),
    note: z.string().optional(),
    lines: z.array(lineSchema).min(1, 'Add at least one budget line'),
  })
  .superRefine((data, ctx) => {
    if (
      (data.periodType === BudgetPeriodTypeEnum.Monthly ||
        data.periodType === BudgetPeriodTypeEnum.Quarterly) &&
      !data.period
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Period is required', path: ['period'] });
    }
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  existingBudget?: BudgetHeaderDetail;
  onSuccess?: () => void;
}

export function SetGroupBudgetForm({ existingBudget, onSuccess }: Props) {
  const isEditMode = !!existingBudget;
  const sym = useGroupCurrencySymbol();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { data: subCatsData, isLoading: accountsLoading } = useGroupBudgetSubCategories();
  const accounts = useMemo(() => (subCatsData as any)?.data ?? [], [subCatsData]);

  const createGroupBudget = useCreateGroupBudget();
  const updateGroupBudget = useUpdateGroupBudget();

  const defaultFiscalYear = existingBudget?.fiscalYear ?? currentYear();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodType: (existingBudget?.periodType as BudgetPeriodTypeEnum) ?? BudgetPeriodTypeEnum.Monthly,
      period: existingBudget?.period ?? currentMonth(),
      fiscalYear: defaultFiscalYear,
      name: existingBudget?.name ?? '',
      note: existingBudget?.note ?? '',
      lines: existingBudget?.lines?.length
        ? existingBudget.lines.map((l) => ({ subCategoryId: l.subCategoryId ?? l.accountId ?? '', budgetAmount: String(l.amount) }))
        : [{ subCategoryId: '', budgetAmount: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });

  const watchedLines = form.watch('lines');
  const watchedPeriodType = form.watch('periodType');
  const watchedPeriod = form.watch('period') ?? '';
  const watchedFiscalYear = form.watch('fiscalYear');

  const { data: prevPeriodData, isLoading: prevLoading } = useGroupPreviousPeriodBudget(
    { periodType: watchedPeriodType, period: watchedPeriod, fiscalYear: watchedFiscalYear },
    !!(watchedPeriodType && watchedFiscalYear),
  );

  const prevPeriodMap = useMemo(() => {
    const m = new Map<string, number>();
    prevPeriodData?.lines?.forEach((l) => {
      const key = (l as any).subCategoryId ?? l.accountId;
      if (key) m.set(key, l.amount);
    });
    return m;
  }, [prevPeriodData]);

  const totalBudget = useMemo(
    () => watchedLines.reduce((sum, l) => sum + (parseFloat(l.budgetAmount) || 0), 0),
    [watchedLines],
  );

  const getSubCategory = (id: string) => accounts.find((a: any) => a.id === id);
  const getCategory = (id: string) => getSubCategory(id)?.categoryName ?? '';

  const handlePeriodTypeChange = (v: BudgetPeriodTypeEnum) => {
    form.setValue('periodType', v);
    if (v === BudgetPeriodTypeEnum.Monthly) form.setValue('period', currentMonth());
    else if (v === BudgetPeriodTypeEnum.Quarterly) form.setValue('period', 'Q1');
    else form.setValue('period', undefined);
  };

  const handleCopyFromPreviousPeriod = () => {
    if (prevLoading) return;
    if (!prevPeriodData?.lines?.length) {
      toast.info('No budget found for the previous period');
      return;
    }
    form.setValue('lines', prevPeriodData.lines.map((l) => ({ subCategoryId: (l as any).subCategoryId ?? l.accountId ?? '', budgetAmount: String(l.amount) })));
    toast.success(`Copied ${prevPeriodData.lines.length} lines from previous period`);
  };

  const handleDownloadTemplate = () => {
    if (!accounts.length) { toast.info('Sub-categories are loading'); return; }
    const csv = `SubCategoryCode,SubCategoryName,Category,BudgetAmount\n${accounts.map((a: any) => `${a.code},${a.name},${a.categoryName},0`).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'group_budget_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = (evt.target?.result as string).split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { toast.error('CSV is empty'); return; }
      const parsed: { subCategoryId: string; budgetAmount: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const code = cols[0]?.trim();
        const amt = parseFloat((cols[3]?.trim() ?? cols[1]?.trim() ?? '0').replace(/[^0-9.-]/g, '')) || 0;
        const subCat = accounts.find((a: any) => a.code === code);
        if (subCat) parsed.push({ subCategoryId: subCat.id, budgetAmount: String(amt) });
      }
      if (!parsed.length) { toast.error('No matching sub-categories found in CSV'); return; }
      form.setValue('lines', parsed);
      toast.success(`Imported ${parsed.length} lines`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const onSubmit = async (values: FormValues) => {
    const period = values.periodType === BudgetPeriodTypeEnum.Yearly ? values.fiscalYear : values.period ?? '';
    const payload = {
      name: values.name,
      periodType: values.periodType,
      month: period,
      fiscalYear: values.fiscalYear,
      note: values.note,
      lines: values.lines.map((l) => ({
        subCategoryId: l.subCategoryId,
        amount: Math.round(parseFloat(l.budgetAmount) * 100),
      })),
    };

    try {
      if (isEditMode && existingBudget) {
        await updateGroupBudget.mutateAsync({ id: existingBudget.id, data: payload });
      } else {
        await createGroupBudget.mutateAsync(payload);
      }
      onSuccess?.();
    } catch {
      // error toast handled by hooks
    }
  };

  const isPending = createGroupBudget.isPending || updateGroupBudget.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />

        {/* Budget Details */}
        <div className="rounded-xl border border-green-100 bg-green-50/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-gray-800">Budget Details</span>
          </div>

          {/* Name — required */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Q4 Group Growth Budget, FY2026 Consolidated Plan" className="bg-white" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="periodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Type <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Select onValueChange={(v) => handlePeriodTypeChange(v as BudgetPeriodTypeEnum)} value={field.value}>
                      <SelectTrigger className="bg-white w-full"><SelectValue /></SelectTrigger>
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
                        <SelectTrigger className="bg-white w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
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
                        <SelectTrigger className="bg-white w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {QUARTERS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
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
                      <SelectTrigger className="bg-white w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FISCAL_YEARS.map((fy) => <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={handleCopyFromPreviousPeriod}
                disabled={prevLoading}
              >
                {prevLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                Copy from Previous Period
              </Button>
              {prevLoading && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching previous period…
                </span>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" onClick={() => csvInputRef.current?.click()}>
              <FileDown className="w-3.5 h-3.5" />
              Import from CSV
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2 text-xs text-gray-500" onClick={handleDownloadTemplate} disabled={accountsLoading || !accounts.length}>
              Download Template
            </Button>
          </div>
        </div>

        {/* Budget Lines */}
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
              onClick={() => append({ subCategoryId: '', budgetAmount: '' })}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Line
            </Button>
          </div>

          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100">
            {['Sub-Category', 'Type', `Budget Amount (${sym})`, 'Last Period', ''].map((h, i) => (
              <span key={i} className="text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-gray-50">
            {fields.map((field, i) => {
              const subCategoryId = watchedLines[i]?.subCategoryId ?? '';
              const category = getCategory(subCategoryId);
              const badgeClass = CATEGORY_BADGE[category] ?? 'bg-gray-100 text-gray-700';
              const lastAmt = prevPeriodMap.get(subCategoryId);

              return (
                <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-3">
                  <FormField
                    control={form.control}
                    name={`lines.${i}.subCategoryId`}
                    render={({ field: f }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <Select onValueChange={f.onChange} value={f.value} disabled={accountsLoading}>
                            <SelectTrigger className="h-9 text-xs w-full">
                              <SelectValue placeholder={accountsLoading ? 'Loading...' : 'Select sub-category'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {accounts.map((acc: any) => (
                                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                  {acc.name}
                                  <span className="text-gray-400 ml-1">({acc.categoryName})</span>
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
                    {category
                      ? <Badge className={`${badgeClass} text-xs font-medium px-2`}>{category}</Badge>
                      : <span className="text-xs text-gray-400">—</span>}
                  </div>

                  <FormField
                    control={form.control}
                    name={`lines.${i}.budgetAmount`}
                    render={({ field: f }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{sym}</span>
                            <Input type="number" min={0} step="0.01" className="pl-6 h-9 text-xs" placeholder="0.00" {...f} />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <span className="text-xs text-gray-500">
                    {subCategoryId && lastAmt !== undefined
                      ? `${sym}${lastAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : '—'}
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
              <p className="text-sm font-medium text-gray-700">{fields.length} sub-categor{fields.length !== 1 ? 'ies' : 'y'}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
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
                <FormControl>
                  <Textarea placeholder="Add any notes, assumptions, or context about this consolidated group budget..." className="bg-white resize-none h-24 text-sm" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 pb-4 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isPending ? 'Saving...' : isEditMode ? 'Update Group Budget' : 'Create Group Budget'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

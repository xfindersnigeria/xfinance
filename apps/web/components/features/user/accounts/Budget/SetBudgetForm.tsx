"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Plus,
  Trash2,
  Copy,
  FileText,
  AlertCircle,
  Loader2,
  Download,
  TrendingUp,
} from "lucide-react";
import {
  useCreateBudget,
  useUpdateBudget,
  useAccounts,
  usePreviousPeriodBudget,
} from "@/lib/api/hooks/useAccounts";
import { BudgetPeriodTypeEnum } from "@/lib/api/hooks/types/accountsTypes";
import type { Account, BudgetHeaderDetail } from "@/lib/api/hooks/types/accountsTypes";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { MONTHS, QUARTERS, getFiscalYearLabels } from "@/lib/period-utils";

const FISCAL_YEARS = getFiscalYearLabels();

const CATEGORY_BADGE: Record<string, string> = {
  Revenue: "bg-green-100 text-green-700 hover:bg-green-100",
  Expense: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  Asset: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  Liability: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  Equity: "bg-orange-100 text-orange-700 hover:bg-orange-100",
};

const budgetLineSchema = z.object({
  account: z.string().min(1, "Account is required"),
  budgetAmount: z.string().min(1, "Budget amount is required"),
});

const setBudgetSchema = z
  .object({
    periodType: z.nativeEnum(BudgetPeriodTypeEnum),
    period: z.string().optional(),
    fiscalYear: z.string().min(1, "Fiscal year is required"),
    budgetName: z.string().min(1, "Budget name is required"),
    budgetLines: z.array(budgetLineSchema).min(1, "At least one budget line is required"),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.periodType === BudgetPeriodTypeEnum.Monthly ||
        data.periodType === BudgetPeriodTypeEnum.Quarterly) &&
      !data.period
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Period is required", path: ["period"] });
    }
  });

type SetBudgetFormData = z.infer<typeof setBudgetSchema>;

interface SetBudgetFormProps {
  existingBudget?: BudgetHeaderDetail;
  onSuccess?: () => void;
}

export default function SetBudgetForm({ existingBudget, onSuccess }: SetBudgetFormProps) {
  const isEditMode = !!existingBudget;
  const sym = useEntityCurrencySymbol();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accountsResponse, isLoading: accountsLoading } = useAccounts({ limit: 500 });
  const accounts: Account[] = useMemo(() => (accountsResponse as any)?.data ?? [], [accountsResponse]);

  const defaultFiscalYear = existingBudget
    ? `FY ${existingBudget.fiscalYear}`
    : `FY ${new Date().getFullYear()}`;

  const form = useForm<SetBudgetFormData>({
    resolver: zodResolver(setBudgetSchema),
    defaultValues: {
      periodType: (existingBudget?.periodType as BudgetPeriodTypeEnum) ?? BudgetPeriodTypeEnum.Monthly,
      period: existingBudget?.period ?? MONTHS[new Date().getMonth()],
      fiscalYear: defaultFiscalYear,
      budgetName: existingBudget?.name ?? "",
      budgetLines: existingBudget?.lines.length
        ? existingBudget.lines.map((l) => ({ account: l.accountId, budgetAmount: String(l.amount) }))
        : [{ account: "", budgetAmount: "" }],
      notes: existingBudget?.note ?? "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "budgetLines" });
  const budgetLines = useWatch({ control: form.control, name: "budgetLines" });
  const periodType = useWatch({ control: form.control, name: "periodType" });
  const watchedPeriod = useWatch({ control: form.control, name: "period" }) ?? "";
  const watchedFiscalYear = useWatch({ control: form.control, name: "fiscalYear" });
  const fyYear = (watchedFiscalYear ?? "").replace("FY ", "");

  const { data: prevPeriodData, isLoading: prevLoading } = usePreviousPeriodBudget(
    { periodType, period: watchedPeriod, fiscalYear: fyYear },
    !!fyYear,
  );

  const prevPeriodMap = useMemo(() => {
    const map = new Map<string, number>();
    prevPeriodData?.lines?.forEach((l) => map.set(l.accountId, l.amount));
    return map;
  }, [prevPeriodData]);

  const totalBudget = budgetLines.reduce((sum, line) => sum + (parseFloat(line.budgetAmount) || 0), 0);

  const getAccountCategory = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    return acc?.categoryName ?? acc?.typeName ?? "";
  };

  const getCategoryBadgeClass = (accountId: string) =>
    CATEGORY_BADGE[getAccountCategory(accountId)] ?? "bg-gray-100 text-gray-700 hover:bg-gray-100";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split(/\r?\n/).filter(Boolean);
      const parsed: { account: string; budgetAmount: string }[] = [];
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(",").map((c) => c.trim().replace(/"/g, ""));
        if (cols.length < 2) continue;
        const match = accounts.find((a) => a.code === cols[0]);
        if (match && cols[1]) parsed.push({ account: match.id, budgetAmount: cols[1] });
      }
      if (parsed.length > 0) {
        form.setValue("budgetLines", parsed, { shouldValidate: true });
        toast.success(`Imported ${parsed.length} budget line${parsed.length !== 1 ? "s" : ""}`);
      } else {
        toast.error("No matching accounts found. Ensure codes match your chart of accounts.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const header = "Account Code,Budget Amount\n";
    const rows = accounts.slice(0, 10).map((a) => `${a.code},0.00`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "budget_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleCopyFromPreviousPeriod = () => {
    if (prevLoading) return;
    if (!prevPeriodData?.lines?.length) {
      toast.info(`No budget found for the previous period`);
      return;
    }
    form.setValue(
      "budgetLines",
      prevPeriodData.lines.map((l) => ({ account: l.accountId, budgetAmount: String(l.amount) })),
      { shouldValidate: false }
    );
    toast.success(`Loaded ${prevPeriodData.lines.length} lines from ${prevPeriodData.period || "previous period"} ${prevPeriodData.fiscalYear}`);
  };

  const onSubmit = async (values: SetBudgetFormData) => {
    const fy = values.fiscalYear.replace("FY ", "");
    const periodValue = values.period ?? fy;
    const payload = {
      name: values.budgetName,
      periodType: values.periodType,
      month: periodValue,
      fiscalYear: fy,
      note: values.notes,
      lines: values.budgetLines.map((line) => ({
        accountId: line.account,
        amount: Math.round(parseFloat(line.budgetAmount) * 100),
      })),
    };

    try {
      if (isEditMode && existingBudget) {
        await updateBudget.mutateAsync({ id: existingBudget.id, data: payload });
      } else {
        await createBudget.mutateAsync(payload);
      }
      onSuccess?.();
    } catch {
      // error handled by hooks
    }
  };

  const periodLabel =
    periodType === BudgetPeriodTypeEnum.Monthly ? "Month"
    : periodType === BudgetPeriodTypeEnum.Quarterly ? "Quarter"
    : null;

  const isPending = createBudget.isPending || updateBudget.isPending;

  return (
    <div className="w-full space-y-6">
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Budget Period */}
          <div className="bg-green-50 p-5 rounded-lg border border-green-200 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Budget Details</h3>
            </div>

            {/* Budget Name — required */}
            <FormField
              control={form.control}
              name="budgetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">
                    Budget Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Q4 Growth Budget, FY2026 Operating Plan" {...field} />
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
                    <FormLabel className="font-semibold">Period Type <span className="text-red-500">*</span></FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => { field.onChange(v); form.setValue("period", ""); }}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(BudgetPeriodTypeEnum).map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {periodLabel && (
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">{periodLabel} <span className="text-red-500">*</span></FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-white w-full">
                            <SelectValue placeholder={`Select ${periodLabel.toLowerCase()}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periodType === BudgetPeriodTypeEnum.Monthly
                            ? MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                            : QUARTERS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
                    <FormLabel className="font-semibold">Fiscal Year <span className="text-red-500">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FISCAL_YEARS.map((fy) => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg flex items-center gap-2 text-sm"
                  onClick={handleCopyFromPreviousPeriod}
                  disabled={prevLoading}
                >
                  {prevLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Copy className="w-4 h-4" />}
                  Copy from Previous Period
                </Button>
                {prevLoading && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fetching previous period…
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg flex items-center gap-2 text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-4 h-4" />
                Import from CSV
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-lg flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                onClick={handleDownloadTemplate}
                disabled={accountsLoading || accounts.length === 0}
              >
                <Download className="w-4 h-4" />
                Download Template
              </Button>
            </div>
          </div>

          {/* Budget Lines */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <h3 className="font-semibold text-gray-900">Budget Lines</h3>
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                onClick={() => append({ account: "", budgetAmount: "" })}
              >
                <Plus className="w-4 h-4" />
                Add Line
              </Button>
            </div>

            <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
              {["Account", "Type", `Budget Amount (${sym})`, "Last Period", ""].map((h, idx) => (
                <span key={idx} className="text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-gray-50">
              {fields.map((field, index) => {
                const currentAccountId = budgetLines[index]?.account ?? "";
                const category = getAccountCategory(currentAccountId);
                return (
                  <div key={field.id} className="grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-3 items-center px-5 py-3">
                    <FormField
                      control={form.control}
                      name={`budgetLines.${index}.account`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <Select value={f.value} onValueChange={f.onChange} disabled={accountsLoading}>
                            <FormControl>
                              <SelectTrigger className="w-full rounded-lg border-gray-300 h-9 text-sm">
                                <SelectValue placeholder={accountsLoading ? "Loading..." : "Select account"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-64">
                              {accounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id} className="text-sm">
                                  {acc.code} – {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center">
                      {category ? (
                        <Badge className={`${getCategoryBadgeClass(currentAccountId)} text-xs font-medium px-2`}>{category}</Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name={`budgetLines.${index}.budgetAmount`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">{sym}</span>
                              <Input type="number" placeholder="0.00" step="0.01" min="0" className="rounded-lg border-gray-300 pl-8 h-9 text-sm" {...f} />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <span className="text-sm text-gray-500">
                      {currentAccountId && prevPeriodMap.has(currentAccountId)
                        ? `${sym}${prevPeriodMap.get(currentAccountId)!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 bg-green-50 border-t border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                    <TrendingUp className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Budget Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {sym}{totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Budget Lines</p>
                  <p className="text-xl font-bold text-gray-900">{fields.length} account{fields.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Notes & Assumptions</h3>
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Add any notes, assumptions, or context about this budget..." className="rounded-lg border-gray-300 min-h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t pt-5 pb-2">
            <Button type="button" variant="outline" className="rounded-lg" onClick={onSuccess}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-2"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {isPending ? "Saving..." : isEditMode ? "Update Budget" : "Create Budget"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

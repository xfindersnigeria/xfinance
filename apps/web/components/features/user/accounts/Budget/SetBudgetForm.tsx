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
  useAccounts,
  usePreviousPeriodBudget,
} from "@/lib/api/hooks/useAccounts";
import { BudgetPeriodTypeEnum } from "@/lib/api/hooks/types/accountsTypes";
import type { Account } from "@/lib/api/hooks/types/accountsTypes";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FISCAL_YEARS = ["FY 2023", "FY 2024", "FY 2025", "FY 2026", "FY 2027"];

const QUARTERS = [
  { value: "Q1", label: "Q1 (Jan–Mar)" },
  { value: "Q2", label: "Q2 (Apr–Jun)" },
  { value: "Q3", label: "Q3 (Jul–Sep)" },
  { value: "Q4", label: "Q4 (Oct–Dec)" },
];

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
    budgetName: z.string().optional(),
    budgetLines: z
      .array(budgetLineSchema)
      .min(1, "At least one budget line is required"),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.periodType === BudgetPeriodTypeEnum.Monthly ||
        data.periodType === BudgetPeriodTypeEnum.Quarterly) &&
      !data.period
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Period is required",
        path: ["period"],
      });
    }
  });

type SetBudgetFormData = z.infer<typeof setBudgetSchema>;

interface SetBudgetFormProps {
  onSuccess?: () => void;
}

export default function SetBudgetForm({ onSuccess }: SetBudgetFormProps) {
  const sym = useEntityCurrencySymbol();
  const createBudget = useCreateBudget();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accountsResponse, isLoading: accountsLoading } = useAccounts({
    limit: 500,
  });
  const accounts: Account[] = useMemo(
    () => (accountsResponse as any)?.data ?? [],
    [accountsResponse]
  );

  const form = useForm<SetBudgetFormData>({
    resolver: zodResolver(setBudgetSchema),
    defaultValues: {
      periodType: BudgetPeriodTypeEnum.Monthly,
      period: "November",
      fiscalYear: `FY ${new Date().getFullYear()}`,
      budgetName: "",
      budgetLines: [{ account: "", budgetAmount: "" }],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "budgetLines",
  });

  const budgetLines = useWatch({ control: form.control, name: "budgetLines" });
  const periodType = useWatch({ control: form.control, name: "periodType" });
  const watchedPeriod = useWatch({ control: form.control, name: "period" }) ?? "";
  const watchedFiscalYear = useWatch({ control: form.control, name: "fiscalYear" });
  const fyYear = (watchedFiscalYear ?? "").replace("FY ", "");

  // Fetch previous period budget for the "Last Period" column
  const { data: prevPeriodData } = usePreviousPeriodBudget(
    { periodType, period: watchedPeriod, fiscalYear: fyYear },
    !!fyYear,
  );

  const prevPeriodMap = useMemo(() => {
    const map = new Map<string, number>();
    prevPeriodData?.lines?.forEach((l) => map.set(l.accountId, l.amount));
    return map;
  }, [prevPeriodData]);

  const totalBudget = budgetLines.reduce(
    (sum, line) => sum + (parseFloat(line.budgetAmount) || 0),
    0
  );

  const getAccountCategory = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    return acc?.categoryName ?? acc?.typeName ?? "";
  };

  const getCategoryBadgeClass = (accountId: string) =>
    CATEGORY_BADGE[getAccountCategory(accountId)] ??
    "bg-gray-100 text-gray-700 hover:bg-gray-100";

  // ── CSV import ────────────────────────────────────────────────────────────
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
        const code = cols[0];
        const amount = cols[1];
        const match = accounts.find((a) => a.code === code);
        if (match && amount) {
          parsed.push({ account: match.id, budgetAmount: amount });
        }
      }

      if (parsed.length > 0) {
        form.setValue("budgetLines", parsed, { shouldValidate: true });
        toast.success(
          `Imported ${parsed.length} budget line${parsed.length !== 1 ? "s" : ""}`
        );
      } else {
        toast.error(
          "No matching accounts found. Ensure codes match your chart of accounts."
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Download CSV template ────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const header = "Account Code,Budget Amount\n";
    const rows = accounts
      .slice(0, 10)
      .map((a) => `${a.code},0.00`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "budget_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  // ── Copy from previous period (real API) ────────────────────────────────
  const handleCopyFromPreviousPeriod = async () => {
    if (!fyYear) {
      toast.error("Please select a fiscal year first");
      return;
    }
    if (!prevPeriodData) {
      toast.info("Loading previous period data...");
      return;
    }
    const lines = prevPeriodData.lines;
    if (!lines.length) {
      toast.info(
        `No budget found for the previous period (${prevPeriodData.period || prevPeriodData.fiscalYear})`
      );
      return;
    }
    form.setValue(
      "budgetLines",
      lines.map((l) => ({
        account: l.accountId,
        budgetAmount: String(l.amount),
      })),
      { shouldValidate: false }
    );
    toast.success(
      `Loaded ${lines.length} line${lines.length !== 1 ? "s" : ""} from ${prevPeriodData.period || "previous period"} ${prevPeriodData.fiscalYear}`
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: SetBudgetFormData) => {
    try {
      const fyYear = values.fiscalYear.replace("FY ", "");
      const periodValue = values.period ?? fyYear;

      const payload = {
        name:
          values.budgetName ||
          `${values.periodType} Budget - ${periodValue} ${fyYear}`,
        periodType: values.periodType,
        month: periodValue,
        fiscalYear: fyYear,
        note: values.notes,
        lines: values.budgetLines.map((line) => ({
          accountId: line.account,
          amount: Math.round(parseFloat(line.budgetAmount) * 100),
        })),
      };

      await createBudget.mutateAsync(payload);
    } catch {
      // error handled by hook effect below
    }
  };

  useEffect(() => {
    if (createBudget.isSuccess) {
      toast.success("Budget set successfully");
      form.reset({
        periodType: BudgetPeriodTypeEnum.Monthly,
        period: "November",
        fiscalYear: `FY ${new Date().getFullYear()}`,
        budgetName: "",
        budgetLines: [{ account: "", budgetAmount: "" }],
        notes: "",
      });
      onSuccess?.();
    }
    if (createBudget.isError) {
      toast.error(createBudget.error?.message || "Failed to set budget");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createBudget.isSuccess, createBudget.isError]);

  const periodLabel =
    periodType === BudgetPeriodTypeEnum.Monthly
      ? "Month"
      : periodType === BudgetPeriodTypeEnum.Quarterly
      ? "Quarter"
      : null;

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-teal-500 rounded-full p-3">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Set Budget</h2>
          <p className="text-sm text-gray-600">
            Create or update budget targets for accounts
          </p>
        </div>
      </div>

      {/* Hidden CSV file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Budget Period ─────────────────────────────────────────────── */}
          <div className="bg-green-50 p-6 rounded-lg border border-green-200 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Budget Period</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Period Type */}
              <FormField
                control={form.control}
                name="periodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Period Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("period", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full rounded-lg border-gray-300 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(BudgetPeriodTypeEnum).map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Month / Quarter — only shown when relevant */}
              {periodLabel && (
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 font-semibold">
                        {periodLabel} <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full rounded-lg border-gray-300 bg-white">
                            <SelectValue
                              placeholder={`Select ${periodLabel.toLowerCase()}`}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periodType === BudgetPeriodTypeEnum.Monthly
                            ? MONTHS.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))
                            : QUARTERS.map((q) => (
                                <SelectItem key={q.value} value={q.value}>
                                  {q.label}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Fiscal Year */}
              <FormField
                control={form.control}
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Fiscal Year <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full rounded-lg border-gray-300 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FISCAL_YEARS.map((fy) => (
                          <SelectItem key={fy} value={fy}>
                            {fy}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Budget Name */}
            <FormField
              control={form.control}
              name="budgetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">
                    Budget Name (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 'Q4 Growth Budget', 'Conservative Forecast'"
                      className="rounded-lg border-gray-300"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg flex items-center gap-2 text-sm"
                onClick={handleCopyFromPreviousPeriod}
              >
                <Copy className="w-4 h-4" />
                Copy from Previous Period
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg flex items-center gap-2 text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-4 h-4" />
                Import from Template
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

          {/* ── Budget Lines ──────────────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Section header */}
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

            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
              {[
                "Account",
                "Type",
                `Budget Amount (${sym})`,
                "Last Period",
                "",
              ].map((h, idx) => (
                <span
                  key={idx}
                  className="text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Lines */}
            <div className="divide-y divide-gray-50">
              {fields.map((field, index) => {
                const currentAccountId = budgetLines[index]?.account ?? "";
                const category = getAccountCategory(currentAccountId);

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-3 items-center px-5 py-3"
                  >
                    {/* Account selector */}
                    <FormField
                      control={form.control}
                      name={`budgetLines.${index}.account`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <Select
                            value={f.value}
                            onValueChange={f.onChange}
                            disabled={accountsLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full rounded-lg border-gray-300 h-9 text-sm">
                                <SelectValue
                                  placeholder={
                                    accountsLoading
                                      ? "Loading..."
                                      : "Select account"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-64">
                              {accounts.map((acc) => (
                                <SelectItem
                                  key={acc.id}
                                  value={acc.id}
                                  className="text-sm"
                                >
                                  {acc.code} – {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Type badge */}
                    <div className="flex items-center">
                      {category ? (
                        <Badge
                          className={`${getCategoryBadgeClass(
                            currentAccountId
                          )} text-xs font-medium px-2`}
                        >
                          {category}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>

                    {/* Budget Amount */}
                    <FormField
                      control={form.control}
                      name={`budgetLines.${index}.budgetAmount`}
                      render={({ field: f }) => (
                        <FormItem className="mb-0">
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                                {sym}
                              </span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className="rounded-lg border-gray-300 pl-8 h-9 text-sm"
                                {...f}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Last Period — from previous period budget */}
                    <span className="text-sm text-gray-500">
                      {currentAccountId && prevPeriodMap.has(currentAccountId)
                        ? `${sym}${prevPeriodMap
                            .get(currentAccountId)!
                            .toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                        : "—"}
                    </span>

                    {/* Remove */}
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

            {/* Total footer */}
            <div className="px-5 py-4 bg-green-50 border-t border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                    <TrendingUp className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Budget Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {sym}
                      {totalBudget.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Budget Lines</p>
                  <p className="text-xl font-bold text-gray-900">
                    {fields.length} account{fields.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Notes & Assumptions ───────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h3 className="font-semibold text-gray-900">Notes & Assumptions</h3>
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">
                    Budget Notes (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes, assumptions, or context about this budget..."
                      className="rounded-lg border-gray-300 min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ── Budget Tips ───────────────────────────────────────────────── */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-2">Budget Tips</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Review historical data from the "Last Period" column to
                    inform your budget
                  </li>
                  <li>
                    • Set realistic targets based on business goals and market
                    conditions
                  </li>
                  <li>
                    • Budget amounts can be updated throughout the period as
                    needed
                  </li>
                  <li>
                    • Use Budget vs Actual reports to track performance against
                    targets
                  </li>
                  <li>
                    • Download the CSV template, fill in amounts, then use
                    "Import from Template" to load multiple lines at once
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ────────────────────────────────────────────── */}
          <div className="flex gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg py-6 font-semibold"
            >
              Cancel
            </Button>
            <div className="flex-1" />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg py-6 font-semibold text-teal-600 border-teal-200 hover:bg-teal-50"
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-6 font-semibold flex items-center gap-2"
                disabled={createBudget.isPending}
              >
                {createBudget.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Set Budget
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

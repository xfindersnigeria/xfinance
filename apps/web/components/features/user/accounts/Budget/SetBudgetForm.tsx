"use client";

import React, { useEffect } from "react";
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
import { Calendar, Plus, Trash2, Copy, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useCreateBudget } from "@/lib/api/hooks/useAccounts";
import { BudgetPeriodTypeEnum } from "@/lib/api/hooks/types/accountsTypes";

// Zod schema for Set Budget Form
const budgetLineSchema = z.object({
  account: z.string().min(1, "Account is required"),
  budgetAmount: z.string().min(1, "Budget amount is required"),
});

const setBudgetSchema = z.object({
  periodType: z.string().min(1, "Period type is required"),
  month: z.string().min(1, "Month is required"),
  fiscalYear: z.string().min(1, "Fiscal year is required"),
  budgetName: z.string().optional(),
  budgetLines: z.array(budgetLineSchema).min(1, "At least one budget line is required"),
  notes: z.string().optional(),
});

type SetBudgetFormData = z.infer<typeof setBudgetSchema>;

interface SetBudgetFormProps {
  onSuccess?: () => void;
}

// Mock data
const periodTypeOptions = ["Monthly", "Quarterly", "Yearly"];
const monthOptions = [
  "January 2025",
  "February 2025",
  "March 2025",
  "April 2025",
  "May 2025",
  "June 2025",
  "July 2025",
  "August 2025",
  "September 2025",
  "October 2025",
  "November 2025",
  "December 2025",
];
const fiscalYearOptions = ["FY 2023", "FY 2024", "FY 2025", "FY 2026"];

const accountOptions = [
  { id: "4000", name: "4000 - Revenue - Product Sales", type: "Revenue" },
  { id: "4100", name: "4100 - Revenue - Service Income", type: "Revenue" },
  { id: "6000", name: "6000 - Payroll Expenses", type: "Expense" },
  { id: "6100", name: "6100 - Marketing Expenses", type: "Expense" },
  { id: "6200", name: "6200 - Utilities Expenses", type: "Expense" },
  { id: "6300", name: "6300 - Rent Expenses", type: "Expense" },
];

const getAccountType = (accountId: string) => {
  const account = accountOptions.find((a) => a.id === accountId);
  return account?.type || "";
};

const getAccountName = (accountId: string) => {
  const account = accountOptions.find((a) => a.id === accountId);
  return account?.name || "";
};

const getTypeBadgeColor = (type: string) => {
  if (type === "Revenue") return "bg-green-100 text-green-700";
  if (type === "Expense") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
};

export default function SetBudgetForm({ onSuccess }: SetBudgetFormProps) {
  const createBudget = useCreateBudget();

  const form = useForm<SetBudgetFormData>({
    resolver: zodResolver(setBudgetSchema),
    defaultValues: {
      periodType: "Monthly",
      month: "November 2025",
      fiscalYear: "FY 2025",
      budgetName: "",
      budgetLines: [
        { account: "4000", budgetAmount: "" },
      ],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "budgetLines",
  });

  const budgetLines = useWatch({
    control: form.control,
    name: "budgetLines",
  });

  const totalBudget = budgetLines.reduce((sum, line) => {
    const amount = parseFloat(line.budgetAmount) || 0;
    return sum + amount;
  }, 0);

  const onSubmit = async (values: SetBudgetFormData) => {
    try {
      const fiscalYear = values.fiscalYear.replace("FY ", "");
      const monthValue = `${fiscalYear}-${String(
        new Date(`${values.month} 2025`).getMonth() + 1
      ).padStart(2, "0")}`;

      const payload = {
        name: values.budgetName || `Budget - ${values.month}`,
        periodType: values.periodType as BudgetPeriodTypeEnum,
        month: monthValue,
        fiscalYear: fiscalYear,
        note: values.notes,
        lines: values.budgetLines.map((line) => ({
          accountId: line.account,
          amount: Math.round(parseFloat(line.budgetAmount) * 100),
        })),
      };

      await createBudget.mutateAsync(payload);
    } catch (error) {
      // error handled below
    }
  };

  useEffect(() => {
    if (createBudget.isSuccess) {
      toast.success("Budget set successfully");
      form.reset({
        periodType: "Monthly",
        month: "November 2025",
        fiscalYear: "FY 2025",
        budgetName: "",
        budgetLines: [{ account: "4000", budgetAmount: "" }],
        notes: "",
      });
      if (onSuccess) onSuccess();
    }
    if (createBudget.isError) {
      toast.error(createBudget.error?.message || "Failed to set budget");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createBudget.isSuccess, createBudget.isError]);

  const handleCopyFromPreviousPeriod = () => {
    // Mock implementation - would populate from previous period
    toast.info("Copying budget from previous period...");
  };

  const handleImportFromTemplate = () => {
    // Mock implementation - would show template selection
    toast.info("Importing from template...");
  };

  const handleAddLine = () => {
    append({ account: "", budgetAmount: "" });
  };

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <div className="bg-teal-500 rounded-full p-3">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Set Budget</h2>
          <p className="text-sm text-gray-600">Create or update budget targets for accounts</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Budget Period Section */}
          <div className="bg-green-50 p-6 rounded-lg border border-green-200 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Budget Period</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="periodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Period Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full rounded-lg border-gray-300">
                          <SelectValue placeholder="Select period type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {periodTypeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Month <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full rounded-lg border-gray-300">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {monthOptions.map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
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
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold">
                      Fiscal Year <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full rounded-lg border-gray-300">
                          <SelectValue placeholder="Select fiscal year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fiscalYearOptions.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg flex items-center gap-2"
                onClick={handleCopyFromPreviousPeriod}
              >
                <Copy className="w-4 h-4" />
                Copy from Previous Period
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg flex items-center gap-2"
                onClick={handleImportFromTemplate}
              >
                <FileText className="w-4 h-4" />
                Import from Template
              </Button>
            </div>
          </div>

          {/* Budget Lines Section */}
          <div className="border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <h3 className="font-semibold text-gray-900">Budget Lines</h3>
              </div>
              <Button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                onClick={handleAddLine}
              >
                <Plus className="w-4 h-4" />
                Add Line
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
                  <FormField
                    control={form.control}
                    name={`budgetLines.${index}.account`}
                    render={({ field: accountField }) => (
                      <FormItem className="col-span-4">
                        <FormLabel className="text-xs text-gray-700">Account</FormLabel>
                        <Select value={accountField.value} onValueChange={accountField.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full rounded-lg border-gray-300">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountOptions.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-2">
                    <label className="text-xs text-gray-700 block mb-2">Type</label>
                    <Badge
                      className={`${getTypeBadgeColor(getAccountType(budgetLines[index]?.account))} px-3 py-1 rounded-full font-medium w-full text-center`}
                    >
                      {getAccountType(budgetLines[index]?.account) || "-"}
                    </Badge>
                  </div>

                  <FormField
                    control={form.control}
                    name={`budgetLines.${index}.budgetAmount`}
                    render={({ field: amountField }) => (
                      <FormItem className="col-span-3">
                        <FormLabel className="text-xs text-gray-700">Budget Amount</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-gray-500">$</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="rounded-lg border-gray-300 pl-7"
                              {...amountField}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-2">
                    <label className="text-xs text-gray-700 block mb-2">Last Period</label>
                    <div className="text-sm font-medium text-gray-900">
                      ${budgetLines[index]?.account === "4000" ? "142,000" : "45,200"}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-1 text-red-600 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total Budget Summary */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📈</span>
                  <div>
                    <p className="text-sm text-gray-700">Total Budget Amount</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${totalBudget.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">Budget Lines</p>
                  <p className="text-2xl font-bold text-gray-900">{fields.length} accounts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Assumptions Section */}
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

          {/* Budget Tips Section */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-3">Budget Tips</p>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Review historical data from the "Last Period" column to inform your budget</li>
                  <li>• Set realistic targets based on business goals and market conditions</li>
                  <li>• Budget amounts can be updated throughout the period as needed</li>
                  <li>• Use Budget vs Actual reports to track performance against targets</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
                className="rounded-lg py-6 font-semibold text-teal-600"
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-6 font-semibold flex items-center justify-center gap-2"
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

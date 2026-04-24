"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSessionStore } from "@/lib/store/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Trash2, Calendar, Loader2 } from "lucide-react";
import { useSetOpeningBalances } from "@/lib/api/hooks/useAccounts";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { Account } from "@/lib/api/hooks/types/accountsTypes";

// Zod schema for Opening Balance Line
const openingBalanceLineSchema = z.object({
  openingBalanceId: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  debit: z.coerce.number().default(0),
  credit: z.coerce.number().default(0),
});

const openingBalanceSchema = z.object({
  date: z.string().min(1, "Opening balance date is required"),
  fiscalYear: z.string().min(4, "Fiscal year is required"),
  note: z.string().optional(),
  items: z
    .array(openingBalanceLineSchema)
    .min(1, "At least one account is required"),
}).refine((data) => {
  const totalDebits = data.items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredits = data.items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  return Math.abs(totalDebits - totalCredits) < 0.01;
}, { message: "Debits and credits must be balanced", path: ["items"] });

type OpeningBalanceFormData = z.infer<typeof openingBalanceSchema>;

interface OpeningBalance {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
}

interface OpeningBalanceFormProps {
  accounts?: Account[];
  existingBalances?: OpeningBalance[];
  openingDate?: string;
  onSuccess?: () => void;
}

export default function OpeningBalanceForm({
  accounts = [],
  existingBalances = [],
  openingDate: initialOpeningDate,
  onSuccess,
}: OpeningBalanceFormProps) {
  const sym = useEntityCurrencySymbol();
  const setOpeningBalances = useSetOpeningBalances();

  const form = useForm<OpeningBalanceFormData>({
    resolver: zodResolver(openingBalanceSchema) as any,
    defaultValues: {
      date: initialOpeningDate || new Date().toISOString().split("T")[0],
      fiscalYear: new Date().getFullYear().toString(),
      note: "",
      items: [{ accountId: "", debit: 0, credit: 0 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const isInitialized = useRef(false);

  console.log(existingBalances, "Existing Balances");

  // Load existing balances when component mounts or existingBalances changes
  useEffect(() => {
    if (isInitialized.current) return;

    if (existingBalances.length > 0) {
      const mapped = existingBalances.map((balance: any) => ({
        openingBalanceId: balance.id,
        accountId: balance.accountId,
        debit: balance.debit || 0,
        credit: balance.credit || 0,
      }));
      replace(mapped as any[]);
      isInitialized.current = true;
    } else if (existingBalances.length === 0 && isInitialized.current === false) {
      isInitialized.current = true;
    }
  }, [existingBalances, replace]);

  // Get account type for a specific account
  const getAccountTypeForId = useCallback(
    (accountId: string) => {
      const account = accounts.find((acc) => acc.id === accountId);
      // Use typeName if available, otherwise traverse nested structure
      const accountType = (account as any)?.typeName || (account as any)?.subCategory?.category?.type?.name;
      return accountType || null;
    },
    [accounts]
  );

  // Determine if account should use debit or credit based on type
  // Assets and Expenses use DEBIT (they increase with debits)
  // Liabilities, Equity, and Revenue use CREDIT (they increase with credits)
  const isDebitAccount = useCallback(
    (accountId: string) => {
      const type = getAccountTypeForId(accountId);
      return type === "Assets" || type === "Expenses";
    },
    [getAccountTypeForId]
  );

  // Watch for account changes to calculate totals
  const watchItems = form.watch("items");
  const totalDebits = watchItems.reduce(
    (sum, item) => sum + (Number(item.debit) || 0),
    0,
  );
  const totalCredits = watchItems.reduce(
    (sum, item) => sum + (Number(item.credit) || 0),
    0,
  );
  const difference = totalDebits - totalCredits;
  const isBalanced = Math.abs(difference) < 0.01;

  const onSubmit = async (values: OpeningBalanceFormData) => {
    if (!isBalanced) {
      toast.error("Opening balance must be balanced (Debits = Credits)");
      return;
    }

    try {
      const items: any[] = values.items.map((item: any) => {
        const out: any = {
          accountId: item.accountId,
          debit: Math.round((item.debit || 0)),
          credit: Math.round((item.credit || 0)),
        };
        if (item.openingBalanceId) out.id = item.openingBalanceId;
        return out;
      });

      const payload = {
        date: new Date(values.date).toISOString(),
        fiscalYear: values.fiscalYear,
        note: values.note || "",
        items: items as any[],
      };
      console.log("Submitting payload:", payload);
      await setOpeningBalances.mutateAsync(payload);
    } catch (error) {
      // error handled below
    }
  };


  const handleAddAccount = useCallback(() => {
    append({ accountId: "", debit: 0, credit: 0 });
  }, [append]);

  const handleAccountChange = useCallback(
    (index: number, accountId: string) => {
      form.setValue(`items.${index}.accountId`, accountId);
      // Reset debit/credit based on account type
      const isDebit = isDebitAccount(accountId);
      if (isDebit) {
        form.setValue(`items.${index}.credit`, 0);
      } else {
        form.setValue(`items.${index}.debit`, 0);
      }
    },
    [form, isDebitAccount]
  );

  const getAccountTypeDisplay = useCallback(
    (accountId: string) => {
      return getAccountTypeForId(accountId) || "—";
    },
    [getAccountTypeForId]
  );

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Opening Balances
        </h2>
        <p className="text-sm text-gray-600">
          Set initial account balances for system setup
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Opening Balance Date, Fiscal Year, and Notes */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Opening Balance Date
                    </FormLabel>
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <FormControl>
                        <input
                          type="date"
                          className="flex-1 bg-transparent border-0 outline-none text-gray-900"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-gray-900">
                      Fiscal Year
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="2000"
                        placeholder="2026"
                        className="rounded-lg border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-gray-900">
                    Notes (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Initial setup balances, Brought forward from previous system"
                      className="rounded-lg border-gray-300"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Account Opening Balances */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Account Opening Balances
            </h3>

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-100 rounded-lg font-semibold text-sm text-gray-700">
              <div className="col-span-3">Account</div>
              <div className="col-span-2">Account Type</div>
              <div className="col-span-2 text-right">Debit</div>
              <div className="col-span-2 text-right">Credit</div>
              <div className="col-span-2"></div>
              <div className="col-span-1"></div>
            </div>

            {/* Account Rows */}
            <div className="space-y-3">
              {fields.map((field, index) => {
                const accountId = watchItems[index]?.accountId;
                const isDebit = isDebitAccount(accountId);

                return (
                  <div key={field.id} className="space-y-2 md:space-y-0">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {/* Account Select */}
                      <div className="md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.accountId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm text-gray-600 md:hidden">
                                Account
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) =>
                                  handleAccountChange(index, value)
                                }
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full rounded-lg border-gray-300 truncate">
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="">
                                  {accounts.map((account) => (
                                    <SelectItem
                                      key={account.id}
                                      value={account.id}
                                    >
                                      {account.name}-{account.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Account Type (Display Only) */}
                      <div className="md:col-span-2">
                        <FormLabel className="text-xs md:text-sm text-gray-600 md:hidden">
                          Account Type
                        </FormLabel>
                        <div className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700">
                          {getAccountTypeDisplay(accountId || "")}
                        </div>
                      </div>

                      {/* Debit Input */}
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.debit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm text-gray-600 md:hidden">
                                Debit
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="rounded-lg border-gray-300 text-right bg-blue-50 border-blue-300"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Credit Input */}
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.credit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm text-gray-600 md:hidden">
                                Credit
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="rounded-lg border-gray-300 text-right bg-green-50 border-green-300"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Delete Button */}
                      <div className="md:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-100 text-red-600"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Another Account Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg border-dashed border-gray-300 py-6 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              onClick={handleAddAccount}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Account
            </Button>
          </div>

          {/* Totals Section */}
          <div className={`p-6 rounded-lg border-2 space-y-3 ${
            isBalanced
              ? "bg-green-50 border-green-200"
              : "bg-orange-50 border-orange-200"
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total Debits</span>
              <span className="font-medium text-gray-900">
                {sym}{totalDebits.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-3">
              <span className="text-gray-700">Total Credits</span>
              <span className="font-medium text-gray-900">
                {sym}{totalCredits.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-3">
              <span className="text-gray-700 font-semibold">Difference</span>
              <span
                className={`font-semibold text-lg ${
                  isBalanced ? "text-green-600" : "text-orange-600"
                }`}
              >
                {sym}{difference.toFixed(2)}
              </span>
            </div>
            {!isBalanced && (
              <div className="text-sm text-orange-700 pt-3">
                ⚠ Opening balance must be balanced before submission
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" className="rounded-lg" type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              disabled={setOpeningBalances.isPending || !isBalanced}
            >
              {setOpeningBalances.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Opening Balances</span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

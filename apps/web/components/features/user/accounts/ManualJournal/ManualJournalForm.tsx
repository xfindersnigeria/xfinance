"use client";

import React, { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSessionStore } from "@/lib/store/session";
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
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useCreateJournal } from "@/lib/api/hooks/useAccounts";
import { Account } from "@/lib/api/hooks/types/accountsTypes";

// Zod schema for Journal Entry Line
const journalLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  debit: z.coerce.number().pipe(z.number()).default(0),
  credit: z.coerce.number().pipe(z.number()).default(0),
  description: z.string().optional(),
});

// Zod schema for Manual Journal Entry
const manualJournalSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  journalLines: z.array(journalLineSchema).min(1, "At least one journal line is required"),
});

type ManualJournalFormData = z.infer<typeof manualJournalSchema>;

interface ManualJournalFormProps {
  accounts?: Account[];
  onSuccess?: () => void;
}



export default function ManualJournalForm({ accounts = [], onSuccess }: ManualJournalFormProps) {
  const { entity, user } = useSessionStore();
  const createJournal = useCreateJournal();

  const form = useForm<ManualJournalFormData>({
    resolver: zodResolver(manualJournalSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      journalLines: [{ accountId: "", debit: 0, credit: 0, description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "journalLines",
  });

  // Watch for line changes to calculate totals
  const watchLines = form.watch("journalLines");
  const totalDebits = watchLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredits = watchLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const onSubmit = async (values: ManualJournalFormData, status: "Draft" | "Active" = "Active") => {
    if (!isBalanced) {
      toast.error("Journal entry must be balanced (Debits = Credits)");
      return;
    }
    try {
      const payload = {
        description: values.description,
        date: new Date(values.date).toISOString(),
        entityId: entity && entity.entityId || "",
        status,
        lines: values.journalLines.map((line) => ({
          accountId: line.accountId,
          debit: Math.round((line.debit || 0)),
          credit: Math.round((line.credit || 0)),
          description: line.description || undefined,
        })),
      };

      await createJournal.mutateAsync(payload);
    } catch (error) {
      // error handled below
    }
  };

  const handleSaveDraft = () => {
    form.handleSubmit((values) => onSubmit(values, "Draft"))();
  };

  const handlePostEntry = () => {
    form.handleSubmit((values) => onSubmit(values, "Active"))();
  };

  useEffect(() => {
    if (createJournal.isSuccess) {
      toast.success("Journal entry saved successfully");
      form.reset({
        date: new Date().toISOString().split("T")[0],
        description: "",
        journalLines: [{ accountId: "", debit: 0, credit: 0, description: "" }],
      });
      if (onSuccess) onSuccess();
    }
    if (createJournal.isError) {
      toast.error(
        createJournal.error?.message || "Failed to save journal entry"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createJournal.isSuccess, createJournal.isError]);

  const handleAddLine = useCallback(() => {
    append({ accountId: "", debit: 0, credit: 0, description: "" });
  }, [append]);

  return (
    <div className="w-full space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Create Journal Entry</h2>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-semibold">Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="rounded-lg border-gray-300"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-semibold">Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter journal entry description..."
                    className="rounded-lg border-gray-300 min-h-24"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Journal Lines */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Journal Lines</h3>

            {/* Table Header - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-100 rounded-lg font-semibold text-sm text-gray-700">
              <div className="col-span-4">Account</div>
              <div className="col-span-2 text-right">Debit</div>
              <div className="col-span-2 text-right">Credit</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1"></div>
            </div>

            {/* Journal Line Rows */}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2 md:space-y-0">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:items-end bg-white p-4 rounded-lg border border-gray-300">
                    {/* Account Select */}
                    <div className="md:col-span-4">
                      <FormField
                        control={form.control}
                        name={`journalLines.${index}.accountId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs md:text-sm text-gray-600 md:hidden">Account</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-full rounded-lg border-gray-300">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {accounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
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

                    {/* Debit Input */}
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`journalLines.${index}.debit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs md:text-sm text-gray-600 md:hidden">Debit</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="rounded-lg border-gray-300 text-right bg-gray-50"
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
                        name={`journalLines.${index}.credit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs md:text-sm text-gray-600 md:hidden">Credit</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="rounded-lg border-gray-300 text-right bg-gray-50"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Description Input */}
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`journalLines.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs md:text-sm text-gray-600 md:hidden">Description</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Line description (optional)"
                                className="rounded-lg border-gray-300"
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
              ))}
            </div>

            {/* Add Line Button */}
            <button
              type="button"
              onClick={handleAddLine}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 border-dashed text-gray-600 hover:text-gray-900 hover:border-gray-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Another Line</span>
            </button>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-3">
            <div className="flex justify-between items-center text-gray-700">
              <span className="font-medium">Total Debits:</span>
              <span className="font-semibold text-gray-900">
                ${totalDebits.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-700 border-t border-gray-300 pt-3">
              <span className="font-medium">Total Credits:</span>
              <span className="font-semibold text-gray-900">
                ${totalCredits.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t pt-6">
            <Button 
              variant="outline" 
              className="rounded-lg" 
              type="button"
              onClick={handleSaveDraft}
              disabled={createJournal.isPending}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={handlePostEntry}
              disabled={!isBalanced || createJournal.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isBalanced ? "Journal entry must be balanced" : ""}
            >
              {createJournal.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <span>Post Entry</span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

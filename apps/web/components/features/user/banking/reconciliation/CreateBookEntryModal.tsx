"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { StatementTransaction } from "./types";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  amount: z.number().positive("Must be greater than 0"),
  type: z.enum(["credit", "debit"]),
  offsetAccountId: z.string().min(1, "Account is required"),
});

export type CreateBookEntryData = z.infer<typeof schema>;

interface CreateBookEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementTx: StatementTransaction | null;
  /** Called with the validated form values. Parent owns the API call. */
  onAdd: (data: CreateBookEntryData) => void;
  loading?: boolean;
}

export default function CreateBookEntryModal({
  open,
  onOpenChange,
  statementTx,
  onAdd,
  loading,
}: CreateBookEntryModalProps) {
  const sym = useEntityCurrencySymbol();

  // negative amount = money out (withdrawal) → CR bank, DR expense
  // positive amount = money in (deposit)     → DR bank, CR income
  // System convention: type="credit" = withdrawal (money out), type="debit" = deposit (money in)
  const isWithdrawal = (statementTx?.amount ?? 0) < 0;
  const entryType: "debit" | "credit" = isWithdrawal ? "credit" : "debit";

  const { data: expenseAccountsData } = useAccounts({ type: "Expenses" });
  const { data: allAccountsData } = useAccounts({ limit: 500 });

  const expenseAccounts: any[] = (expenseAccountsData?.data as any) || [];
  const allAccounts: any[] = (allAccountsData?.data as any) || [];

  // Deposits can offset against revenue, liabilities, equity — exclude bank/cash accounts
  const depositAccounts = allAccounts.filter(
    (a: any) =>
      !["Cash and Cash Equivalents"].includes(
        a.subCategoryName ?? a.subCategory?.name ?? "",
      ),
  );

  const offsetAccounts = isWithdrawal ? expenseAccounts : depositAccounts;

  const form = useForm<CreateBookEntryData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: "",
      description: "",
      reference: "",
      amount: 0,
      type: entryType,
      offsetAccountId: "",
    },
  });

  // Pre-fill whenever the clicked statement transaction changes
  useEffect(() => {
    if (!statementTx) return;
    form.reset({
      date: statementTx.date,
      description: statementTx.description,
      reference: statementTx.reference || "",
      amount: Math.abs(statementTx.amount),
      type: (statementTx.amount ?? 0) < 0 ? "credit" : "debit",
      offsetAccountId: "",
    });
  }, [statementTx, form]);

  const handleClose = (v: boolean) => {
    if (!v) form.reset();
    onOpenChange(v);
  };

  return (
    <CustomModal
      open={open}
      onOpenChange={handleClose}
      title="Create Book Entry"
      description={
        isWithdrawal
          ? "Record this withdrawal — debit the expense account, credit the bank."
          : "Record this deposit — debit the bank, credit the income account."
      }
      module={MODULES.BANKING}
      width="sm:max-w-lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onAdd)} className="space-y-4 pt-6 pb-4">

          <div className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${
            isWithdrawal
              ? "bg-red-50 text-red-700 border border-red-100"
              : "bg-green-50 text-green-700 border border-green-100"
          }`}>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${isWithdrawal ? "bg-red-100" : "bg-green-100"}`}>
              {isWithdrawal ? "DR" : "CR"}
            </span>
            {isWithdrawal
              ? "Withdrawal — expense account debited, bank credited"
              : "Deposit — bank debited, income account credited"}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                  <FormControl><Input placeholder="e.g., CHQ/12345" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="e.g., Bank charges for November" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{sym}</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="pl-7"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="offsetAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isWithdrawal ? "Expense Account" : "Income / Offset Account"} *
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={isWithdrawal ? "Select expense account..." : "Select account..."}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {offsetAccounts.length > 0 ? (
                        offsetAccounts.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" disabled>
                          No accounts found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Add to Books &amp; Match
            </Button>
          </div>
        </form>
      </Form>
    </CustomModal>
  );
}

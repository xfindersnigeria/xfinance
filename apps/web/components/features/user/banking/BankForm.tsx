"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Building2, DollarSign } from "lucide-react";
import { useCreateBankAccount, useUpdateBankAccount } from "@/lib/api/hooks/useBanking";
import { toast } from "sonner";

const bankAccountSchema = z.object({
  accountName: z.string().min(1, "Account name required"),
  bankName: z.string().min(1, "Bank name required"),
  accountType: z.enum(["checking", "savings", "money market", "credit card"]),
  currency: z.string().min(1, "Currency required"),
  accountNumber: z.string().min(1, "Account number required"),
  routingNumber: z.string().optional(),
  openingBalance: z.number().min(0, "Opening balance must be 0 or more"),
});

type BankAccountFormType = z.infer<typeof bankAccountSchema>;

const defaultValues: BankAccountFormType = {
  accountName: "",
  bankName: "",
  accountType: "checking",
  currency: "USD",
  accountNumber: "",
  routingNumber: "",
  openingBalance: 0,
};

interface BankFormProps {
  account?: Partial<BankAccountFormType> & { id?: string };
  isEditMode?: boolean;
}

export default function BankForm({ account, isEditMode = false }: BankFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBankAccount = useCreateBankAccount();
  const updateBankAccount = useUpdateBankAccount();

  const form = useForm<BankAccountFormType>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountName: account?.accountName || "",
      bankName: account?.bankName || "",
      accountType: (account?.accountType as any) || "checking",
      currency: account?.currency || "USD",
      accountNumber: account?.accountNumber || "",
      routingNumber: account?.routingNumber || "",
      openingBalance: account?.openingBalance || 0,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (account) {
      form.reset({
        accountName: account.accountName || "",
        bankName: account.bankName || "",
        accountType: (account.accountType as any) || "checking",
        currency: account.currency || "USD",
        accountNumber: account.accountNumber || "",
        routingNumber: account.routingNumber || "",
        openingBalance: account.openingBalance || 0,
      });
    }
  }, [account, form]);

  const onSubmit = async (values: BankAccountFormType) => {
    try {
      setIsSubmitting(true);

      if (isEditMode && account?.id) {
        // Update existing bank account
        await updateBankAccount.mutateAsync({
          id: account.id,
          data: {
            accountName: values.accountName,
            bankName: values.bankName,
            accountType: values.accountType,
            currency: values.currency,
            accountNumber: values.accountNumber,
            routingNumber: values.routingNumber || undefined,
            openingBalance: Number(values.openingBalance),
          },
        });
      } else {
        // Create new bank account
        await createBankAccount.mutateAsync({
          accountName: values.accountName,
          bankName: values.bankName,
          accountType: values.accountType,
          currency: values.currency,
          accountNumber: values.accountNumber,
          routingNumber: values.routingNumber || undefined,
          openingBalance: Number(values.openingBalance),
        });
      }

      form.reset();
      setIsSubmitting(false);
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} bank account:`, error);
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          className=" space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {/* Account Basics */}
          <div className="rounded-2xl border bg-linear-to-br from-blue-50 to-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="text-blue-500 w-5 h-5" />
              <span className="font-semibold text-base">Account Details</span>
            </div>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Operating Account"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Chase Business"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="money market">Money Market</SelectItem>
                            <SelectItem value="credit card">Credit Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="NGN">NGN</SelectItem>
                            <SelectItem value="CAD">CAD</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Account Numbers */}
          <div className="rounded-2xl border bg-linear-to-br from-green-50 to-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="text-green-500 w-5 h-5" />
              <span className="font-semibold text-base">Account Numbers</span>
            </div>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter account number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="routingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Routing Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter routing number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Opening Balance */}
          <div className="rounded-2xl border bg-linear-to-br from-pink-50 to-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="text-pink-500 w-5 h-5" />
              <span className="font-semibold text-base">Balance</span>
            </div>
            <FormField
              control={form.control}
              name="openingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Balance</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Connecting..."
                : isEditMode
                  ? "Update Account"
                  : "Connect Bank"}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}

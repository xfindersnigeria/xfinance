"use client";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DollarSign, AlertCircle } from "lucide-react";
import {
  useVendors,
  useBillsByVendor,
  useCreatePaymentMade,
  useUpdatePaymentMade,
} from "@/lib/api/hooks/usePurchases";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { paymentMethodOptions } from "../../income/payment-received/PaymentReceivedForm";
import { useEffect, useState } from "react";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

const paymentSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  billId: z.string().min(1, "Bill is required"),
  paymentDate: z.date(),
  amount: z.number().min(0.01, "Amount is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  accountId: z.string().min(1, "From account is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormType = z.infer<typeof paymentSchema>;

const defaultValues: PaymentFormType = {
  vendorId: "",
  billId: "",
  paymentDate: new Date(),
  amount: 0,
  paymentMethod: "",
  accountId: "",
  reference: "",
  notes: "",
};

interface PaymentMadeFormProps {
  vendorId?: string;
  billId?: string;
  payment?: Partial<PaymentFormType> & { id?: string };
  isEditMode?: boolean;
}

export default function PaymentMadeForm({
  vendorId: propVendorId,
  billId: propBillId,
  payment,
  isEditMode = false,
}: PaymentMadeFormProps = {}) {
  const { closeModal } = useModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    propVendorId || payment?.vendorId || "",
  );
  const sym = useEntityCurrencySymbol();
  const [selectedBillId, setSelectedBillId] = useState<string>(
    propBillId || payment?.billId || "",
  );
  const [billAmount, setBillAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  const createPaymentMade = useCreatePaymentMade();
  const updatePaymentMade = useUpdatePaymentMade();

  const { data: vendorsData, isLoading: vendorsLoading } = useVendors();
  const { data: billsData, isLoading: billsLoading } =
    useBillsByVendor(selectedVendorId);
  const { data: accountsData, isLoading: accountsLoading } = useAccounts({
    subCategory: "Cash and Cash Equivalents",
  });

  const vendors = (vendorsData as any)?.vendors || [];
  const bills = (billsData as any)?.bills || [];
  const cashAccounts = (accountsData?.data as any) || [];

  // Update bill details when bill is selected
  useEffect(() => {
    if (selectedBillId && bills.length > 0) {
      const selectedBill = bills.find((b: any) => b.id === selectedBillId);
      if (selectedBill) {
        setBillAmount(selectedBill.total || 0);
        setPaidAmount(selectedBill.paidAmount || 0);
      }
    }
  }, [selectedBillId, bills]);

  const form = useForm<PaymentFormType>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      vendorId: propVendorId || payment?.vendorId || "",
      billId: propBillId || payment?.billId || "",
      paymentDate: payment?.paymentDate
        ? new Date(payment.paymentDate)
        : new Date(),
      amount: payment?.amount || 0,
      paymentMethod: payment?.paymentMethod || "",
      accountId: payment?.accountId || "",
      reference: payment?.reference || "",
      notes: payment?.notes || "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (selectedVendorId) {
      setSelectedVendorId(selectedVendorId);
    }
  }, [propVendorId]);

  useEffect(() => {
    if (selectedBillId) {
      setSelectedBillId(selectedBillId);
    }
  }, [propBillId]);

  const onSubmit = async (values: PaymentFormType) => {
    try {
      setIsSubmitting(true);

      const payload = {
        ...values,
        amount: Number(values.amount),
        paymentDate:
          values.paymentDate instanceof Date
            ? values.paymentDate.toISOString()
            : new Date(values.paymentDate).toISOString(),
      };

      if (isEditMode && payment?.id) {
        await updatePaymentMade.mutateAsync({
          id: payment.id,
          data: payload,
        });
      } else {
        await createPaymentMade.mutateAsync(payload);
      }

      form.reset();
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error submitting payment:", error);
      setIsSubmitting(false);
    }
  };

  const remainingAmount = billAmount - paidAmount;
  const watchAmount = form.watch("amount");

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          {/* Vendor and Bill Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50 p-4 rounded-2xl border">
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor *</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedVendorId(value);
                        // Reset bill selection when vendor changes
                        form.setValue("billId", "");
                        setSelectedBillId("");
                      }}
                      value={field.value}
                      disabled={vendorsLoading || !!propVendorId}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue
                          placeholder={
                            vendorsLoading
                              ? "Loading vendors..."
                              : "Select vendor"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(vendors) && vendors.length > 0 ? (
                          vendors.map((v: any) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.displayName || v.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-vendors" disabled>
                            No vendors found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill *</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedBillId(value);
                      }}
                      value={field.value}
                      disabled={
                        billsLoading || !selectedVendorId || !!propBillId
                      }
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue
                          placeholder={
                            billsLoading
                              ? "Loading bills..."
                              : !selectedVendorId
                                ? "Select vendor first"
                                : "Select bill"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(bills) && bills.length > 0 ? (
                          bills.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.billNumber || b.id} - ({sym}
                              {b.total.toLocaleString()})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-bills" disabled>
                            No bills found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Bill Amount And Remaining Amount */}
          {/* {selectedBillId && (
            <div className="bg-green-50 p-4 rounded-2xl border space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-600">Total Bill Amount</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${billAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-600">Already Paid</p>
                  <p className="text-lg font-bold text-blue-600">
                    ${paidAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-600">Remaining</p>
                  <p
                    className={`text-lg font-bold ${
                      remainingAmount > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    ${remainingAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              {watchAmount > remainingAmount && (
                <div className="flex items-start gap-2 text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs">
                    Payment amount exceeds remaining bill balance
                  </p>
                </div>
              )}
            </div>
          )} */}

          {/* Payment Details */}
          <div className="rounded-2xl border bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-blue-500 w-5 h-5" />
              <span className="font-semibold text-base">Payment Details</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value instanceof Date
                            ? format(field.value, "yyyy-MM-dd")
                            : format(new Date(field.value), "yyyy-MM-dd")
                        }
                        onChange={(e) =>
                          field.onChange(new Date(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={
                          selectedBillId
                            ? `Max: $${remainingAmount.toFixed(2)}`
                            : "0.00"
                        }
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethodOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
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
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Account *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger
                          className="w-full bg-white"
                          disabled={accountsLoading}
                        >
                          <SelectValue placeholder="Select cash account" />
                        </SelectTrigger>
                        <SelectContent>
                          {cashAccounts.length > 0 ? (
                            cashAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.code})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-accounts" disabled>
                              No cash accounts found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Reference/Check Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Transaction ID, check number, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this payment..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-2 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 text-white flex items-center gap-2"
              disabled={isSubmitting}
            >
              <DollarSign className="w-4 h-4" />
              {isSubmitting
                ? "Recording..."
                : isEditMode
                  ? "Update Payment"
                  : "Record Payment"}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}

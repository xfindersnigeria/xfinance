"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { useCreateBillPayment, useBills } from "@/lib/api/hooks/usePurchases";
import { toast } from "sonner";
import { Calendar, DollarSign, Info } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

const paymentSchema = z.object({
    billId: z.string().min(1, "Bill selection required"),
    paymentDate: z.date(),
    amount: z.number().min(0.01, "Amount must be greater than zero"),
    paymentMethod: z.string().min(1, "Payment method required"),
    fromAccount: z.string().min(1, "Account required"),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

type PaymentFormType = z.infer<typeof paymentSchema>;

interface MakeBillPaymentProps {
    billId?: string;
}

export default function MakeBillPayment({
    billId,
}: MakeBillPaymentProps) {
    const { data: billsData, isLoading: billsLoading } = useBills();
    const createPayment = useCreateBillPayment();

    const bills = (billsData as any)?.bills || [];
    const selectedBill = bills.find((b: any) => b.id === billId);
    const balanceDue = selectedBill ? (Number(selectedBill.balanceDue) ?? Number(selectedBill.total)) : 0;

    const form = useForm<PaymentFormType>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            billId: billId || "",
            paymentDate: new Date(),
            amount: balanceDue || 0,
            paymentMethod: "Bank Transfer",
            fromAccount: "Operating Account",
            reference: "",
            notes: "",
        },
    });

    // Sync amount if billId changes or data loads
    useEffect(() => {
        if (billId && selectedBill) {
            form.setValue("billId", billId);
            form.setValue("amount", balanceDue);
        }
    }, [billId, selectedBill, balanceDue, form]);

    const onSubmit = async (values: PaymentFormType) => {
        if (values.amount > balanceDue + 0.01) { // Small buffer for floating point
            toast.error(`Payment amount ($${values.amount}) exceeds balance due ($${balanceDue})`);
            return;
        }

        try {
            await createPayment.mutateAsync({
                billId: values.billId,
                data: values,
            });
        } catch (error) {
            // toast error handled in hook
        }
    };

    const handlePayFull = () => {
        form.setValue("amount", balanceDue);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
                {selectedBill && (
                    <Alert className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 text-sm">
                            Making payment for <span className="font-bold">Bill #{selectedBill.billNumber}</span>.
                            Outstanding balance: <span className="font-bold">${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="billId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Select Bill</FormLabel>
                                <FormControl>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={!!billId || billsLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a bill" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bills.map((b: any) => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    #{b.billNumber} - ${Number(b.total).toLocaleString()} ({b.vendor?.displayName})
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
                        name="paymentDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Payment Date</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            value={format(field.value, "yyyy-MM-dd")}
                                            onChange={(e) => field.onChange(new Date(e.target.value))}
                                        />
                                        <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem className="relative">
                                <FormLabel>Amount to Pay</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <div className="relative flex-1">
                                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="pl-9"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </div>
                                    </FormControl>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={handlePayFull}
                                    >
                                        Pay Full
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Payment Method</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select method" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="Check">Check</SelectItem>
                                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="fromAccount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>From Account</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Operating Account">Operating Account (Wells Fargo)</SelectItem>
                                        <SelectItem value="Savings Account">Savings Account (Chase)</SelectItem>
                                        <SelectItem value="Petty Cash">Petty Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="reference"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reference / Check #</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. CHK-1002" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Internal notes about this payment"
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="submit" className="w-full sm:w-auto px-8" disabled={createPayment.isPending}>
                        {createPayment.isPending ? "Processing..." : "Record Payment"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

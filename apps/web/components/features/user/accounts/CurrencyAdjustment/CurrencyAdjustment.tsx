"use client";

import { useCustomers } from "@/lib/api/hooks/useSales";
import CurrencyAdjustmentHeader from "./CurrencyAdjustmentHeader";
import CurrencyAdjustmentForm from "./CurrencyAdjustmentForm";

export default function CurrencyAdjustment() {
  const { data, isLoading } = useCustomers();
  const customers = data?.customers || [];
  return (
    <div className="space-y-4">
      <CurrencyAdjustmentHeader data={data} loading={isLoading} />

      <CurrencyAdjustmentForm />
    </div>
  );
}

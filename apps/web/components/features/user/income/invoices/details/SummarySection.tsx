"use client";

import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface SummarySectionProps {
  subtotal: number;
  tax: number;
  total: number;
  balanceDue: number;
  currency: string;
}

export default function SummarySection({
  subtotal,
  tax,
  total,
  balanceDue,
  currency,
}: SummarySectionProps) {
  const sym = useEntityCurrencySymbol();

  return (
    <div className="flex justify-start sm:justify-end">
      <div className="w-full sm:w-80 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Subtotal</span>
          <span className="text-gray-900 font-medium">
            {sym}
            {subtotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm border-b border-gray-200 pb-2">
          <span className="text-gray-700">Tax (10%)</span>
          <span className="text-gray-900 font-medium">
            {sym}
            {tax.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-between text-base font-semibold mb-2">
          <span className="text-gray-900">Total</span>
          <span className="text-gray-900">
            {sym}
            {total.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-between text-base font-semibold bg-blue-50 px-3 py-2 rounded">
          <span className="text-blue-900">Balance Due</span>
          <span className="text-blue-900">
            {sym}
            {balanceDue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

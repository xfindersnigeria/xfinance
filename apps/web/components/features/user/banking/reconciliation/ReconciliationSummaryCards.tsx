"use client";

import { ReconciliationSummary } from "./types";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ReconciliationSummaryCardsProps {
  summary: ReconciliationSummary;
}

function formatCurrency(amount: number, sym: string) {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}k`;
  return `${sym}${amount.toLocaleString()}`;
}

export default function ReconciliationSummaryCards({
  summary,
}: ReconciliationSummaryCardsProps) {
  const sym = useEntityCurrencySymbol();
  const isDifferenceZero = summary.difference === 0;

  const cards = [
    {
      label: "Statement Balance",
      value: formatCurrency(summary.statementBalance, sym),
      subLabel: "Bank statement",
      highlight: false,
      valueColor: "text-gray-900",
    },
    {
      label: "Book Balance",
      value: formatCurrency(summary.bookBalance, sym),
      subLabel: "Your records",
      highlight: false,
      valueColor: summary.bookBalance < 0 ? "text-red-700" : "text-gray-900",
    },
    {
      label: "Difference",
      value: formatCurrency(summary.difference, sym),
      subLabel: isDifferenceZero ? "Reconciled" : "To resolve",
      highlight: !isDifferenceZero,
      valueColor: isDifferenceZero ? "text-green-700" : "text-amber-700",
    },
    {
      label: "Progress",
      value: `${summary.matchedCount}/${summary.totalItems}`,
      subLabel: "Items matched",
      highlight: false,
      valueColor: "text-gray-900",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-5 ${
            card.highlight
              ? "bg-amber-50 border-amber-200"
              : "bg-white border-gray-200"
          }`}
        >
          <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
          <p className={`text-2xl font-bold ${card.valueColor}`}>
            {card.value}
          </p>
          <p
            className={`text-xs mt-1 ${
              card.highlight ? "text-amber-600" : "text-gray-400"
            }`}
          >
            {card.subLabel}
          </p>
        </div>
      ))}
    </div>
  );
}

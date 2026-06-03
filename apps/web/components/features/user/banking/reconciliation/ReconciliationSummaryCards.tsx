"use client";

import { ReconciliationSummary } from "./types";

interface ReconciliationSummaryCardsProps {
  summary: ReconciliationSummary;
  sym: string;
}

function fmt(amount: number, sym: string) {
  const abs = Math.abs(amount);
  const prefix = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${prefix}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${sym}${(abs / 1_000).toFixed(1)}k`;
  return `${prefix}${sym}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReconciliationSummaryCards({
  summary,
  sym,
}: ReconciliationSummaryCardsProps) {
  const isDifferenceZero = Math.abs(summary.difference) < 0.01;

  const cards = [
    {
      label: "Statement Balance",
      value: fmt(summary.statementBalance, sym),
      subLabel: "Per bank statement",
      highlight: false,
      valueColor: "text-gray-900",
    },
    {
      label: "GL Account Balance",
      value: fmt(summary.glBalance, sym),
      subLabel: "Per your books",
      highlight: false,
      valueColor: summary.glBalance < 0 ? "text-red-700" : "text-gray-900",
    },
    {
      label: "Cleared Balance",
      value: fmt(summary.bookBalance, sym),
      subLabel: "Sum of matched items",
      highlight: false,
      valueColor: "text-gray-900",
    },
    {
      label: "Difference",
      value: fmt(summary.difference, sym),
      subLabel: isDifferenceZero ? "Reconciled ✓" : "To resolve",
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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${
            card.highlight ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
          }`}
        >
          <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
          <p className={`text-xl font-bold ${card.valueColor}`}>{card.value}</p>
          <p className={`text-xs mt-1 ${card.highlight ? "text-amber-600" : "text-gray-400"}`}>
            {card.subLabel}
          </p>
        </div>
      ))}
    </div>
  );
}

"use client";
import { Folder } from "lucide-react";
import React from "react";

const categories = [
  { name: "All Reports", count: 34 },
  { name: "Business Overview", count: 6 },
  { name: "Sales", count: 4 },
  { name: "Receivables", count: 3 },
  { name: "Payments Received", count: 2 },
  { name: "Recurring Invoices", count: 2 },
  { name: "Payables", count: 3 },
  { name: "Purchases and Expenses", count: 5 },
  { name: "Taxes", count: 3 },
  { name: "Banking", count: 4 },
  { name: "Projects and Timesheet", count: 2 },
];

export default function ReportsSidebar({
  selected = 0,
  onSelect,
}: {
  selected?: number;
  onSelect?: (idx: number) => void;
}) {
  return (
    <aside className="w-64 min-w-55 bg-white rounded-2xl border border-border p-6 flex flex-col h-full">
      <div className="mb-6">
        <div className="text-xs text-gray-400 font-semibold mb-2">
          REPORT CATEGORY
        </div>
        <ul className="space-y-1">
          {categories.map((cat, idx) => (
            <li key={cat.name}>
              <button
                className={`flex items-center w-full px-3 py-2 rounded-lg text-left transition font-medium text-sm ${
                  selected === idx
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => onSelect && onSelect(idx)}
              >
                <span className="flex-1 flex items-center gap-2 text-xs">
                  <span className="inline-block w-4">
                    <Folder className="w-3 h-3" />{" "}
                  </span>
                  {cat.name}
                </span>
                <span
                  className={`ml-2 text-xs font-semibold ${
                    selected === idx
                      ? "bg-primary/20 text-primary"
                      : "bg-gray-100 text-gray-500"
                  } px-2 py-0.5 rounded-full`}
                >
                  {cat.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

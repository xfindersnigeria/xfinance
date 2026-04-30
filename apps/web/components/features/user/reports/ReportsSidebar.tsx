"use client";
import { Folder } from "lucide-react";
import React from "react";
import { reportsData } from "./ReportsColumn";
import { buildCategories } from "./utils";

export default function ReportsSidebar({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (key: string) => void
}) {
  const categories = buildCategories(reportsData)

  return (
    <aside className="w-64 min-w-55 bg-white rounded-2xl border border-border p-6 flex flex-col h-full">
      <div className="mb-6">
        <div className="text-xs text-gray-400 font-semibold mb-2">
          REPORT CATEGORY
        </div>

        <ul className="space-y-1">
          {categories.map((cat) => (
            <li key={cat.key}>
              <button
                className={`flex items-center w-full px-3 py-2 rounded-lg text-left transition font-medium text-sm ${
                  selected === cat.key
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => onSelect(cat.key)}
              >
                <span className="flex-1 flex items-center gap-2 text-xs">
                  <Folder className="w-3 h-3" />
                  {cat.name}
                </span>

                <span
                  className={`ml-2 text-xs font-semibold ${
                    selected === cat.key
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
  )
}

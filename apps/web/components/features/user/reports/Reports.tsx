"use client";

import { useEffect, useState } from "react";
import ReportsSidebar from "./ReportsSidebar";
import ReportsTable from "./ReportsTable";

const STORAGE_KEY = "reports:selectedCategory";

export function useReportsCategory(defaultValue = "all") {
  const [category, setCategory] = useState<string>(defaultValue);

  // load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCategory(saved);
  }, []);

  // persist changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, category);
  }, [category]);

  return { category, setCategory };
}

export default function Reports() {
  const { category, setCategory } = useReportsCategory("all");

  return (
    <div className="flex gap-4 w-full min-h-[80vh] p-4">
      <div className="sticky top-10 self-start h-fit" style={{ minWidth: 240 }}>
        <ReportsSidebar selected={category} onSelect={setCategory} />
      </div>

      <div className="flex-1 overflow-x-auto">
        <ReportsTable selectedCategory={category} />
      </div>
    </div>
  );
}

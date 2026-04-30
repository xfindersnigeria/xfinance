const categoryLabelMap: Record<string, string> = {
  financial: "Business Overview",
  sales_receivables: "Sales & Receivables",
  payables_expenses: "Payables & Expenses",
  taxes: "Taxes",
  banking: "Banking",
  inventory: "Inventory",
};

export function buildCategories(reports: { category: string }[]) {
  const counts: Record<string, number> = {};

  for (const report of reports) {
    counts[report.category] = (counts[report.category] || 0) + 1;
  }

  const categories = Object.entries(counts).map(([key, count]) => ({
    name: categoryLabelMap[key] ?? key,
    key,
    count,
  }));

  // Add "All Reports"
  return [
    {
      name: "All Reports",
      key: "all",
      count: reports.length,
    },
    ...categories,
  ];
}



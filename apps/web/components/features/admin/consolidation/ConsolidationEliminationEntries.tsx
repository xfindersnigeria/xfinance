"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomTable, type Column } from "@/components/local/custom/custom-table";

interface EliminationEntry {
  account: string;
  description: string;
  entity: string;
  debit: string;
  credit: string;
}

const mockData: EliminationEntry[] = [
  {
    account: "Intercompany Sales",
    description: "Eliminate intercompany revenue",
    entity: "All",
    debit: "-",
    credit: "₦547,000",
  },
  {
    account: "Intercompany Purchases",
    description: "Eliminate intercompany COGS",
    entity: "All",
    debit: "₦547,000",
    credit: "-",
  },
  {
    account: "Intercompany Payables",
    description: "Eliminate intercompany payables",
    entity: "All",
    debit: "₦330,000",
    credit: "-",
  },
  {
    account: "Intercompany Receivables",
    description: "Eliminate intercompany receivables",
    entity: "All",
    debit: "-",
    credit: "₦330,000",
  },
];

const columns: Column<EliminationEntry>[] = [
  { key: "account", title: "Account", className: "text-sm font-medium" },
  { key: "description", title: "Description", className: "text-sm text-muted-foreground" },
  { key: "entity", title: "Entity", className: "text-sm" },
  {
    key: "debit",
    title: "Debit",
    className: "text-sm text-right",
    render: (value) => <span className="text-sm">{value}</span>,
  },
  {
    key: "credit",
    title: "Credit",
    className: "text-sm text-right font-medium",
    render: (value) => <span className="text-sm font-medium">{value}</span>,
  },
];

export default function ConsolidationEliminationEntries() {
  const totalDebits = "₦877,000";
  const totalCredits = "₦877,000";
  const balance = "₦0";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Consolidation Elimination Entries</CardTitle>
          <CardDescription>Journal entries for eliminating intercompany transactions</CardDescription>
        </div>
        <Button className="">
          Generate Entries
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <CustomTable
            columns={columns}
            data={mockData}
            pageSize={10}
            tableTitle="Elimination Entries"
            display={{
              searchComponent: false,
              filterComponent: false,
            }}
          />
          <div className="flex justify-end gap-8 pt-4 border-t">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Debits</p>
              <p className="text-lg font-bold text-primary">{totalDebits}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Credits</p>
              <p className="text-lg font-bold text-primary">{totalCredits}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-lg font-bold text-green-600">{balance}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomTable, type Column } from "@/components/local/custom/custom-table";

interface IntercompanyTransaction {
  transactionId: string;
  fromEntity: string;
  toEntity: string;
  type: string;
  amount: string;
  variance: string;
  status: "Matched" | "Unmatched";
}

const mockData: IntercompanyTransaction[] = [
  {
    transactionId: "IC-2025-001",
    fromEntity: "Hunslow Inc. (US)",
    toEntity: "Hunslow UK Ltd",
    type: "Sales",
    amount: "₦125,000",
    variance: "₦0",
    status: "Matched",
  },
  {
    transactionId: "IC-2025-002",
    fromEntity: "Hunslow UK Ltd",
    toEntity: "Hunslow GmbH (DE)",
    type: "Service Fee",
    amount: "₦45,000",
    variance: "₦0",
    status: "Matched",
  },
  {
    transactionId: "IC-2025-003",
    fromEntity: "Hunslow Inc. (US)",
    toEntity: "Hunslow Asia Pte Ltd",
    type: "Loan",
    amount: "₦250,000",
    variance: "₦0",
    status: "Matched",
  },
];

const columns: Column<IntercompanyTransaction>[] = [
  { key: "transactionId", title: "Transaction ID", className: "text-sm font-medium" },
  { key: "fromEntity", title: "From Entity", className: "text-sm" },
  { key: "toEntity", title: "To Entity", className: "text-sm" },
  { key: "type", title: "Type", className: "text-sm" },
  {
    key: "amount",
    title: "Amount",
    className: "text-sm text-right font-medium",
    render: (value) => <span className="text-sm font-medium">{value}</span>,
  },
  {
    key: "variance",
    title: "Variance",
    className: "text-sm text-right",
    render: (value) => <span className="text-sm text-green-600 font-medium">{value}</span>,
  },
  {
    key: "status",
    title: "Status",
    className: "text-sm",
    render: (value) => (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        {value}
      </Badge>
    ),
  },
];

export default function IntercompanyTransactions() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Intercompany Transactions</CardTitle>
          <CardDescription>Cross-entity transaction matching and reconciliation</CardDescription>
        </div>
        <Button variant="outline" className="gap-2">
          📥 Import Transactions
        </Button>
      </CardHeader>
      <CardContent>
        <CustomTable
          columns={columns}
          data={mockData}
          pageSize={10}
          tableTitle="Transactions"
          display={{
            searchComponent: false,
            filterComponent: false,
          }}
        />
      </CardContent>
    </Card>
  );
}

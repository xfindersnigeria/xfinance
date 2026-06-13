"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ExpenseViewModalProps {
  expense: any;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const variant =
    s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2">
      <span className="text-sm text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function ExpenseViewModal({ expense }: ExpenseViewModalProps) {
  const date = expense?.date ? format(new Date(expense.date), "dd MMM yyyy") : "—";
  const createdAt = expense?.createdAt
    ? format(new Date(expense.createdAt), "dd MMM yyyy, HH:mm")
    : "—";

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">
          {expense?.reference || expense?.id}
        </span>
        <StatusBadge status={expense?.status || "draft"} />
      </div>

      <Separator />

      <div>
        <Row label="Date" value={date} />
        <Row label="Vendor" value={expense?.vendor?.displayName || expense?.vendorId || "—"} />
        <Row label="Expense Account" value={expense?.expenseAccount?.name || expense?.expenseAccountId || "—"} />
        <Row label="Payment Account" value={expense?.paymentAccount?.name || expense?.paymentAccountId || "—"} />
        <Row label="Payment Method" value={expense?.paymentMethod?.replace(/_/g, " ")} />
      </div>

      <Separator />

      <div>
        <Row
          label="Amount"
          value={
            <span className="text-base font-bold">
              {(expense?.amount ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          }
        />
        <Row
          label="Tax"
          value={`${(expense?.tax ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        />
      </div>

      {expense?.description && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{expense.description}</p>
          </div>
        </>
      )}

      {expense?.tags && expense.tags.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {(Array.isArray(expense.tags) ? expense.tags : [expense.tags]).map(
                (tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                )
              )}
            </div>
          </div>
        </>
      )}

      {expense?.attachment && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Attachment</p>
            <a
              href={expense.attachment.secureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline underline-offset-2"
            >
              View Attachment
            </a>
          </div>
        </>
      )}

      <Separator />
      <Row label="Created At" value={createdAt} />
    </div>
  );
}

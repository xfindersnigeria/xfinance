import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BankReconciliationCard() {
  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-border w-full">
      <div className="text-xl font-semibold text-foreground mb-1">
        Bank Reconciliation
      </div>
      <div className="text-sm text-muted-foreground mb-6">
        Operating Account - November 2025
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <div className="bg-muted rounded-xl px-4 py-3">
            <div className="text-sm text-muted-foreground mb-1">
              Bank Statement Balance
            </div>
            <div className="text-2xl font-bold text-foreground">$487,250</div>
          </div>
          <div className="bg-muted rounded-xl px-4 py-3">
            <div className="text-sm text-muted-foreground mb-1">Book Balance</div>
            <div className="text-2xl font-bold text-foreground">$485,050</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Outstanding Deposits
              </div>
              <div className="text-lg font-semibold text-revenue">
                +$18,750
              </div>
            </div>
          </div>
          <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Outstanding Checks
              </div>
              <div className="text-lg font-semibold text-expense">-$20,950</div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-finance-warning/10 border border-finance-warning/30 rounded-xl px-5 py-4 flex items-start gap-3 mb-6">
        <AlertTriangle className="text-finance-warning mt-1" size={24} />
        <div>
          <div className="font-semibold text-foreground mb-1">
            Reconciliation Variance Detected
          </div>
          <div className="text-sm text-muted-foreground">
            There is a variance of $2,200 between bank and book balances. Please
            review outstanding items.
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-foreground">Reconciliation Progress</div>
        <div className="text-xs text-muted-foreground">32 of 44 items matched</div>
      </div>
      <div className="w-full h-2 bg-muted rounded-full mb-4">
        <div
          className="h-2 bg-primary rounded-full"
          style={{ width: "72.7%" }}
        />
      </div>
      <div className="flex gap-4">
        <Button
          variant="secondary"
          className="flex-1 py-3 rounded-full font-semibold text-base"
        >
          Review Items
        </Button>
        <Button className="flex-1 py-3 rounded-full font-semibold text-base">
          Complete Reconciliation
        </Button>
      </div>
    </div>
  );
}

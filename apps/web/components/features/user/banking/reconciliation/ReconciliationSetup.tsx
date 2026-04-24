"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReconciliationSetupValues } from "./types";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ReconciliationSetupProps {
  values: ReconciliationSetupValues;
  onChange: (values: ReconciliationSetupValues) => void;
  accountName: string;
}

export default function ReconciliationSetup({
  values,
  onChange,
  accountName,
}: ReconciliationSetupProps) {
  const sym = useEntityCurrencySymbol();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">
            Statement Ending Date
          </Label>
          <Input
            type="date"
            value={values.statementEndingDate}
            onChange={(e) =>
              onChange({ ...values, statementEndingDate: e.target.value })
            }
            className="bg-gray-50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">
            Statement Ending Balance
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
              {sym}
            </span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.statementEndingBalance}
              onChange={(e) =>
                onChange({
                  ...values,
                  statementEndingBalance: parseFloat(e.target.value) || 0,
                })
              }
              className="pl-7 bg-gray-50"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Account</Label>
          <Input
            value={accountName}
            readOnly
            className="bg-gray-100 text-gray-600 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}

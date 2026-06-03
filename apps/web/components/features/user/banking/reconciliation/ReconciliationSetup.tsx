"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReconciliationSetupValues } from "./types";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ReconciliationSetupProps {
  values: ReconciliationSetupValues;
  onChange: (values: ReconciliationSetupValues) => void;
  accountName: string;
  readOnly?: boolean;
}

export default function ReconciliationSetup({
  values,
  onChange,
  accountName,
  readOnly = false,
}: ReconciliationSetupProps) {
  const sym = useEntityCurrencySymbol();
  const inputCls = readOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-gray-50";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Statement Start Date</Label>
          <Input
            type="date"
            value={values.statementStartDate}
            onChange={(e) => onChange({ ...values, statementStartDate: e.target.value })}
            className={inputCls}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Statement End Date</Label>
          <Input
            type="date"
            value={values.statementEndingDate}
            onChange={(e) => onChange({ ...values, statementEndingDate: e.target.value })}
            className={inputCls}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Statement Ending Balance</Label>
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
                onChange({ ...values, statementEndingBalance: parseFloat(e.target.value) || 0 })
              }
              className={`pl-7 ${inputCls}`}
              placeholder="0.00"
              readOnly={readOnly}
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberInput } from "@/components/ui/number-input";
import { useTaxOptions } from "@/lib/api/hooks/useTax";
import { taxLabel } from "@/lib/tax/totals";

export interface TaxValue {
  taxRate?: number;
  taxName?: string | null;
}

interface TaxSelectProps {
  value: TaxValue;
  onChange: (value: { taxRate: number; taxName: string | null }) => void;
  disabled?: boolean;
  className?: string;
}

const NONE = "none";
const CURRENT = "current";
const CUSTOM = "custom";

/**
 * Tax picker for document forms — the entity's active tax rates, tax groups
 * and exemptions from Settings → Tax, plus "No tax" and a custom rate. A
 * document saved with a rate that is no longer in the list keeps showing it.
 */
export function TaxSelect({ value, onChange, disabled, className }: TaxSelectProps) {
  const { data, isLoading } = useTaxOptions();
  const options = data?.options ?? [];
  const [customMode, setCustomMode] = useState(false);

  const rate = value.taxRate ?? 0;
  const name = value.taxName ?? null;

  const selectedKey = useMemo(() => {
    if (customMode) return CUSTOM;
    if (value.taxRate === undefined) return "";
    const match = options.find((o) => o.rate === rate && o.taxName === name);
    if (match) return match.key;
    if (rate === 0 && !name) return NONE;
    return CURRENT;
  }, [customMode, options, rate, name, value.taxRate]);

  return (
    <div className={className}>
      <Select
        value={selectedKey}
        disabled={disabled || isLoading}
        onValueChange={(key) => {
          if (key === CUSTOM) {
            setCustomMode(true);
            onChange({ taxRate: rate, taxName: null });
            return;
          }
          setCustomMode(false);
          if (key === NONE) return onChange({ taxRate: 0, taxName: null });
          if (key === CURRENT) return;
          const opt = options.find((o) => o.key === key);
          if (opt) onChange({ taxRate: opt.rate, taxName: opt.taxName });
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Loading taxes..." : "Select tax"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No tax</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
          {selectedKey === CURRENT && (
            <SelectItem value={CURRENT}>{taxLabel(name, rate)}</SelectItem>
          )}
          <SelectItem value={CUSTOM}>Custom rate…</SelectItem>
        </SelectContent>
      </Select>
      {customMode && (
        <div className="mt-2 flex items-center gap-2">
          <NumberInput
            value={value.taxRate}
            onChange={(v) => onChange({ taxRate: Math.min(100, Math.max(0, v ?? 0)), taxName: null })}
            placeholder="Rate"
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      )}
    </div>
  );
}

/**
 * New documents start with the entity's default tax (Settings → Tax) once the
 * options load — unless the user has already picked one. Returns whether
 * prices are tax-inclusive for this entity.
 */
export function useDefaultTax(
  isNew: boolean,
  current: TaxValue,
  apply: (value: { taxRate: number; taxName: string | null }) => void,
): { inclusive: boolean; enabled: boolean; loading: boolean } {
  const { data, isLoading } = useTaxOptions();
  const applied = useRef(false);

  useEffect(() => {
    if (!isNew || applied.current || !data) return;
    applied.current = true;
    if (current.taxRate !== undefined) return;
    apply(data.default ? { taxRate: data.default.rate, taxName: data.default.taxName } : { taxRate: 0, taxName: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isNew]);

  return {
    inclusive: data?.taxInclusive ?? false,
    enabled: data?.taxCalculation ?? true,
    loading: isLoading,
  };
}

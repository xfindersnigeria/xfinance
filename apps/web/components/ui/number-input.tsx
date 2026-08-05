"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumberInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "type"
  > {
  value: number | undefined | null;
  onChange: (value: number | undefined) => void;
}

function formatDisplay(raw: string): string {
  if (!raw) return "";
  const [intPart, decPart] = raw.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

function stripFormatting(display: string): string {
  return display.replace(/,/g, "");
}

/**
 * Plain number input with live thousands-separator formatting as the user
 * types — display only. onChange always emits the raw numeric value (or
 * undefined when empty), so callers send exactly what they send today.
 * Unlike a raw `type="number"` input bound via `{...field}`, this never
 * forces a value back to 0 — clearing the field yields `undefined`, and
 * the placeholder shows instead.
 */
export function NumberInput({
  value,
  onChange,
  placeholder = "0.00",
  className,
  ...props
}: NumberInputProps) {
  const [display, setDisplay] = useState<string>(() =>
    value === undefined || value === null || (value as any) === ""
      ? ""
      : formatDisplay(String(value)),
  );

  useEffect(() => {
    if (value === undefined || value === null || (value as any) === "") {
      if (display !== "") setDisplay("");
      return;
    }
    const numeric = Number(stripFormatting(display));
    if (Number(value) !== numeric) {
      setDisplay(formatDisplay(String(value)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    const normalized =
      parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;

    setDisplay(formatDisplay(normalized));

    if (normalized === "" || normalized === ".") {
      onChange(undefined);
      return;
    }
    const numeric = Number(normalized);
    onChange(Number.isNaN(numeric) ? undefined : numeric);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(className)}
      {...props}
    />
  );
}

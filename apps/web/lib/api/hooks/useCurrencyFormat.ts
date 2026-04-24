"use client";
import { useCurrencies, useEntityConfig } from "./useSettings";
import { getCurrencyByCode } from "@/lib/utils/currencies";

/** Symbol for the group's primary currency — used in group-scoped admin views */
export function useGroupCurrencySymbol(): string {
  const { data } = useCurrencies();
  const currencies: any[] = (data as any)?.data ?? [];
  const primary = currencies.find((c) => c.isPrimary);
  return primary?.symbol ?? getCurrencyByCode(primary?.code)?.symbol ?? "—";
}

/** Symbol for the current entity's base currency — used in entity-scoped forms/views */
export function useEntityCurrencySymbol(): string {
  const { data } = useEntityConfig();
  const code: string = (data as any)?.data?.baseCurrency ?? "";
  if (!code) return "—";
  return getCurrencyByCode(code)?.symbol ?? code;
}

/** Code for the current entity's base currency */
export function useEntityBaseCurrency(): string {
  const { data } = useEntityConfig();
  return (data as any)?.data?.baseCurrency ?? "";
}

/** Whether multi-currency is enabled on the current entity */
export function useEntityMultiCurrency(): boolean {
  const { data } = useEntityConfig();
  return (data as any)?.data?.multiCurrency ?? false;
}

/** Format a number with a currency symbol */
export function fmtAmount(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact format: ₦1.2M, ₦500K etc. */
export function fmtAmountCompact(amount: number, symbol: string): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

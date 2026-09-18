"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="bg-green-100 text-green-700 border-transparent px-3 py-1 rounded-full font-medium">Active</Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-500 border-transparent px-3 py-1 rounded-full font-medium">Inactive</Badge>
  );
}

/** "7.5" / "20" / "12.875" — trims trailing zeros */
export function fmtRate(rate: number): string {
  return `${Number(rate.toFixed(4))}%`;
}

/** Turn a 2-letter ISO country code into its flag emoji (regional indicator symbols) */
export function flagEmoji(countryCode: string | null | undefined): string | null {
  if (!countryCode || !/^[a-zA-Z]{2}$/.test(countryCode)) return null;
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/** Mirrors the API's effectiveGroupRate — sum, or each rate charged on top of the previous ones */
export function combinedRate(rates: number[], compound: boolean): number {
  const combined = compound
    ? (rates.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100
    : rates.reduce((acc, r) => acc + r, 0);
  return Math.round(combined * 10000) / 10000;
}

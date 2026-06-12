export type CompactFormatResult = {
  value: number;
  unit: "" | "K" | "M" | "B";
  formatted: string;
};

export function formatCompactNumber(
  input: number,
  currencySymbol: string = "",
): CompactFormatResult {
  const absValue = Math.abs(input);

  let value = input;
  let unit: CompactFormatResult["unit"] = "";

  if (absValue >= 1_000_000_000) {
    value = input / 1_000_000_000;
    unit = "B";
  } else if (absValue >= 1_000_000) {
    value = input / 1_000_000;
    unit = "M";
  } else if (absValue >= 1_000) {
    value = input / 1_000;
    unit = "K";
  }

  const roundedValue = Number(value.toFixed(0));

  return {
    value: roundedValue,
    unit,
    formatted: `${currencySymbol}${roundedValue}${unit}`,
  };
}

export const DEFAULT_PRIMARY = '#4152B6';

/**
 * Returns '#ffffff' or '#000000' depending on which has better contrast with the given hex color.
 * Uses the WCAG relative luminance formula.
 */
export function contrastColor(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.35 ? '#000000' : '#ffffff';
}

export interface GroupCustomization {
  primaryColor: string;
  logoUrl: string | null;
  loginBgUrl: string | null;
}

export const DEFAULT_CUSTOMIZATION: GroupCustomization = {
  primaryColor: DEFAULT_PRIMARY,
  logoUrl: "/images/logo.png",
  loginBgUrl: "/images/auth.jpg",
};

/**
 * Generates the CSS :root override string for a given customization.
 * Safe to use server-side (no DOM access).
 */
export function buildThemeCss(customization: GroupCustomization | null | undefined): string {
  const primary = customization?.primaryColor || DEFAULT_PRIMARY;
  const foreground = contrastColor(primary);
  return `
:root {
  --primary: ${primary};
  --primary-foreground: ${foreground};
  --ring: ${primary};
  --sidebar-primary: ${primary};
  --sidebar-primary-foreground: ${foreground};
}`.trim();
}

/** Validate a hex color string. */
export function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

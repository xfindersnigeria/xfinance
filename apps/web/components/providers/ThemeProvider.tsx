'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/lib/store/session';
import { buildThemeCss, DEFAULT_CUSTOMIZATION, GroupCustomization } from '@/lib/utils/colorUtils';

const STYLE_ID = 'xf-group-theme';

function injectTheme(customization: GroupCustomization | null | undefined) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildThemeCss(customization ?? DEFAULT_CUSTOMIZATION);
}

/**
 * ThemeProvider — injects group-scoped CSS variable overrides into <head>.
 * Re-runs whenever whoami.customization changes (e.g. after impersonation
 * switch or real-time customization-changed event).
 * Place this inside SessionProvider so it always has session context.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const customization = useSessionStore((state) => state.whoami?.customization);

  useEffect(() => {
    injectTheme(customization);
  }, [customization]);

  return <>{children}</>;
}

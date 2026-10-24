"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/lib/store/session";
import { deleteDraft, loadDraft, saveDraft } from "./draft-store";

interface Options<T> {
  /** Feature name, e.g. "bulk-expense". Combined with user + entity (+ scope). */
  feature: string;
  /** Extra discriminator, e.g. the bank account the import targets. */
  scope?: string;
  /** Only load/autosave while true (e.g. the modal is open). */
  enabled: boolean;
  /** Current state to persist. Return null to mean "nothing worth saving". */
  value: T | null;
  version?: number;
  debounceMs?: number;
}

/**
 * Autosaves `value` (debounced) and offers the saved draft back for resuming.
 * Draft is keyed per user + entity + feature so it never leaks across tenants.
 * It is removed only by `discard()` — call that after a fully successful save.
 */
export function useDraft<T>({
  feature,
  scope = "",
  enabled,
  value,
  version = 1,
  debounceMs = 500,
}: Options<T>) {
  const whoami = useSessionStore((s) => s.whoami);
  const userId = (whoami as any)?.user?.id;
  const entityId = whoami?.context?.currentEntity?.id ?? "none";
  const key = userId ? `draft:${userId}:${entityId}:${feature}:${scope}` : null;

  const [saved, setSaved] = useState<{ data: T; savedAt: number } | null>(null);
  const [checked, setChecked] = useState(false);
  const suppress = useRef(false);

  // On open: look for an existing draft to offer.
  useEffect(() => {
    if (!enabled || !key) return;
    let live = true;
    setChecked(false);
    loadDraft<T>(key, version).then((rec) => {
      if (!live) return;
      setSaved(rec ? { data: rec.data, savedAt: rec.savedAt } : null);
      setChecked(true);
    });
    return () => {
      live = false;
    };
  }, [enabled, key, version]);

  // Debounced autosave.
  useEffect(() => {
    if (!enabled || !key || suppress.current) return;
    if (value === null) return;
    const t = setTimeout(() => void saveDraft(key, value, version), debounceMs);
    return () => clearTimeout(t);
  }, [enabled, key, value, version, debounceMs]);

  const discard = useCallback(async () => {
    suppress.current = true;
    setSaved(null);
    if (key) await deleteDraft(key);
    // allow autosave again once the caller has moved on
    setTimeout(() => (suppress.current = false), debounceMs + 100);
  }, [key, debounceMs]);

  /** Hide the resume banner without deleting (user chose to resume). */
  const dismissOffer = useCallback(() => setSaved(null), []);

  return { saved: checked ? saved : null, discard, dismissOffer };
}

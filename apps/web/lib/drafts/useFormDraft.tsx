"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useSessionStore } from "@/lib/store/session";
import { DraftBanner } from "@/components/local/shared/DraftBanner";
import { deleteDraft, loadDraft, saveDraft } from "./draft-store";

interface Options {
  /** Feature name, e.g. "invoice". Combined with user + entity (+ scope). */
  feature: string;
  /** Human label for the banner, e.g. "invoice". */
  label: string;
  /** Extra discriminator when one feature has several independent drafts. */
  scope?: string;
  /** Pass false in edit mode — drafts are only for new records. */
  enabled?: boolean;
  version?: number;
  debounceMs?: number;
}

/**
 * Standard draft behaviour for react-hook-form create forms: autosave while
 * the user types (and once more on unmount), offer "Resume / Discard" next
 * time, and clear only when the caller confirms a successful save.
 *
 *   const { banner, discardDraft } = useFormDraft(form, {...});
 *   ...render {banner} above the form...
 *   after a successful create: await discardDraft(); form.reset();
 */
export function useFormDraft<T extends FieldValues>(
  form: UseFormReturn<T>,
  { feature, label, scope = "", enabled = true, version = 1, debounceMs = 500 }: Options,
) {
  const whoami = useSessionStore((s) => s.whoami);
  const userId = (whoami as any)?.user?.id;
  const entityId = whoami?.context?.currentEntity?.id ?? "none";
  const key = enabled && userId ? `draft:${userId}:${entityId}:${feature}:${scope}` : null;

  const [offer, setOffer] = useState<{ data: T; savedAt: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<T | null>(null);

  // Reading isDirty here subscribes react-hook-form to it. It only turns true
  // on real user edits — programmatic setValue (e.g. a default tax rate that
  // loads after mount) doesn't count, so no pointless drafts get offered.
  void form.formState.isDirty;
  const isDirty = useCallback(() => form.formState.isDirty, [form]);

  // Look for an existing draft when the form appears.
  useEffect(() => {
    if (!key) return;
    let live = true;
    loadDraft<T>(key, version).then((rec) => {
      if (live && rec) setOffer({ data: rec.data, savedAt: rec.savedAt });
    });
    return () => {
      live = false;
    };
  }, [key, version]);

  // Debounced autosave + a final save on unmount (closing a sheet/page).
  useEffect(() => {
    if (!key) return;
    const sub = form.watch((values) => {
      latest.current = values as T;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (isDirty()) void saveDraft(key, latest.current, version);
      }, debounceMs);
    });
    return () => {
      sub.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (latest.current && isDirty()) void saveDraft(key, latest.current, version);
    };
  }, [key, form, version, debounceMs, isDirty]);

  const discardDraft = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    latest.current = null;
    setOffer(null);
    if (key) await deleteDraft(key);
  }, [key]);

  const resume = useCallback(() => {
    if (!offer) return;
    // keepDefaultValues: the restored values still count as "unsaved changes".
    form.reset(offer.data as any, { keepDefaultValues: true });
    latest.current = offer.data;
    setOffer(null);
  }, [form, offer]);

  const banner: ReactNode = offer ? (
    <DraftBanner savedAt={offer.savedAt} label={label} onResume={resume} onDiscard={discardDraft} />
  ) : null;

  return { banner, discardDraft };
}

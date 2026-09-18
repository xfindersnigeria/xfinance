"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeStoreItemImage, uploadStoreItemImage } from "@/lib/api/services/productsService";

export const MAX_ITEM_IMAGE_BYTES = 5 * 1024 * 1024;

/** What the form should do with the image once the item is saved */
export interface ImageChange {
  file: File | null;
  removed: boolean;
}

/**
 * Picks an image and previews it locally. Nothing is uploaded here — the
 * item has to exist first, so the form calls `applyImageChange` after save.
 */
export function StoreItemImagePicker({
  currentUrl,
  value,
  onChange,
  disabled,
}: {
  currentUrl?: string | null;
  value: ImageChange;
  onChange: (value: ImageChange) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value.file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(value.file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);

  const preview = objectUrl ?? (value.removed ? null : currentUrl ?? null);

  const pick = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (JPG, PNG, WebP...)");
      return;
    }
    if (file.size > MAX_ITEM_IMAGE_BYTES) {
      toast.error(`Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — the maximum is 5MB`);
      return;
    }
    onChange({ file, removed: false });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="size-20 shrink-0 overflow-hidden rounded-xl border bg-muted flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Item" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            {preview ? "Change image" : "Upload image"}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="text-destructive"
              onClick={() => onChange({ file: null, removed: !!currentUrl })}
            >
              <X className="size-4" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Shown on POS and the online store. Max 5MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Upload / remove the picked image for a saved item. Returns false if it failed. */
export async function applyImageChange(itemId: string, change: ImageChange, hadImage: boolean) {
  try {
    if (change.file) await uploadStoreItemImage(itemId, change.file);
    else if (change.removed && hadImage) await removeStoreItemImage(itemId);
    return true;
  } catch (error) {
    toast.error(
      `Item saved, but the image could not be updated: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return false;
  }
}

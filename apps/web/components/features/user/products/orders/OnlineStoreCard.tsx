"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy, ExternalLink, Globe, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStoreSettings, useUpdateStoreSettings } from "@/lib/api/hooks/useOrders";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const noop = () => () => undefined;

/** window.location.origin without a server/client hydration mismatch */
const useOrigin = () =>
  useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );

export default function OnlineStoreCard() {
  const origin = useOrigin();
  const { data: store, isLoading } = useStoreSettings();
  const update = useUpdateStoreSettings();
  const [slugOpen, setSlugOpen] = useState(false);
  const [slug, setSlug] = useState("");

  const url = store?.path ? `${origin}${store.path}` : "";
  const published = !!store?.enabled && !!store?.path;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Store link copied");
    } catch {
      toast.error("Could not copy — select the link and copy it manually");
    }
  };

  const openSlugDialog = () => {
    setSlug(store?.slug || store?.suggestedSlug || "");
    setSlugOpen(true);
  };

  const saveSlug = () => {
    const next = slug.trim().toLowerCase();
    if (!SLUG_RE.test(next)) {
      toast.error("Use lowercase letters, numbers and single dashes only");
      return;
    }
    update.mutate(
      { slug: next },
      {
        onSuccess: () => {
          toast.success("Store link updated");
          setSlugOpen(false);
        },
      },
    );
  };

  return (
    <div className="mb-4 rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Globe className="size-5 text-primary" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Online Store</span>
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : published ? (
                <Badge className="bg-green-100 text-green-700 rounded-full">Published</Badge>
              ) : (
                <Badge variant="outline" className="rounded-full text-muted-foreground">
                  Not published
                </Badge>
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-4 w-64" />
            ) : published ? (
              <div className="min-w-0 text-sm">
                <a href={url} target="_blank" rel="noreferrer" className="block truncate text-primary hover:underline">
                  {url}
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Publish to share a link where customers can browse and order your items.
              </p>
            )}
            {store && (
              <p className="text-xs text-muted-foreground">
                {store.onlineItems > 0
                  ? `${store.onlineItems} ${store.onlineItems === 1 ? "item" : "items"} for sale online`
                  : 'No items for sale online yet — turn on "Sell on Online Store" on your store items.'}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-2 flex items-center gap-2 text-sm">
            <Switch
              checked={!!store?.enabled}
              disabled={isLoading || update.isPending}
              onCheckedChange={(enabled) =>
                update.mutate(
                  { enabled },
                  { onSuccess: () => toast.success(enabled ? "Online store published" : "Online store unpublished") },
                )
              }
            />
            {store?.enabled ? "Published" : "Publish"}
          </label>
          <Button variant="outline" size="sm" disabled={isLoading} onClick={openSlugDialog}>
            <Pencil className="size-4" />
            Edit Link
          </Button>
          <Button variant="outline" size="sm" disabled={!published} onClick={copy}>
            <Copy className="size-4" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" disabled={!published} asChild={published}>
            {published ? (
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Visit Online Store
              </a>
            ) : (
              <>
                <ExternalLink className="size-4" />
                Visit Online Store
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={slugOpen} onOpenChange={setSlugOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Store link</DialogTitle>
            <DialogDescription>
              Changing the link breaks the old one — anyone with the old link will see &quot;Store not found&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="store-slug">Link name</Label>
            <Input
              id="store-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              onKeyDown={(e) => e.key === "Enter" && saveSlug()}
              placeholder="my-store"
            />
            <p className="break-all text-xs text-muted-foreground">
              {origin}/store/{slug || "…"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlugOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSlug} disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

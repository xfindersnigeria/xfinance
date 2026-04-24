"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import CollectionsForm from "./CollectionsForm";
import CollectionsStatCardSmall from "./CollectionsStatCardSmall";
import { CollectionsResponse } from "@/lib/api/hooks/types/productsTypes";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

export default function CollectionsHeader({
  data,
  loading,
}: {
  data?: CollectionsResponse["stats"];
  loading: boolean;
}) {
  const { isOpen, openModal, closeModal } = useModal();
  const sym = useEntityCurrencySymbol();

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Collections</h2>
          <p className="text-muted-foreground">
            Organize items into collections ({data?.totalCollections}{" "}
            collections)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl" disabled>
            <Download />
            Export
          </Button>
          <Button
            onClick={() => openModal(MODAL.COLLECTION_CREATE)}
            className="rounded-xl"
          >
            <Plus /> New Collection
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CollectionsStatCardSmall
          title="Total Collections"
          value={<span>{data?.totalCollections || 0}</span>}
          subtitle={<span>{data?.activeCollections || 0} active</span>}
        />
        <CollectionsStatCardSmall
          title="Total Items"
          value={<span>{data?.totalItems || 0}</span>}
          subtitle={<span>Across collections</span>}
        />
        <CollectionsStatCardSmall
          title="Total Value"
          value={
            <span>
              {data?.totalValue
                ? data.totalValue >= 1000000000
                  ? `${sym}${data.totalValue / 1000000000}b`
                  : data.totalValue >= 1000000
                    ? `${sym}${data.totalValue / 1000000}m`
                    : `${sym}${data.totalValue / 1000}k`
                : `${sym}0`}
            </span>
          }
          subtitle={<span>Collection value</span>}
        />
        <CollectionsStatCardSmall
          title="Most Popular"
          value={<span className="text-lg leading-1">{data?.mostPopularCollection}</span>}
          subtitle={<span>{data?.mostPopularItemCount}</span>}
        />
      </div>

      <CustomModal
        title="Add New Collection"
        module={MODULES.PRODUCTS}
        open={isOpen(MODAL.COLLECTION_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.COLLECTION_CREATE)
            : closeModal(MODAL.COLLECTION_CREATE)
        }
      >
        <CollectionsForm />
      </CustomModal>
    </div>
  );
}

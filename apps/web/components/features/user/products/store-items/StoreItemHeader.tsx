"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import CustomerStatCardSmall from "./StoreItemStatCardSmall";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import ItemForm from "./StoreItemForm";
import { StoreItemsResponse } from "@/lib/api/hooks/types/productsTypes";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

function formatValue(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n.toLocaleString()}`;
}

export default function StoreItemHeader({
  data,
  loading,
}: {
  data?: StoreItemsResponse;
  loading: boolean;
}) {
  const { isOpen, openModal, closeModal } = useModal();
  const totalCount = data?.total ?? 0;
  const totalInStock = data?.totalInStock ?? 0;
  const totalOutOfStock = data?.totalOutOfStock ?? 0;
  const totalValue = data?.totalValue ?? 0;

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Store Items</h2>
          <p className="text-muted-foreground">
            Manage inventory items and products ({totalCount} items)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl" disabled>
            <Download />
            Export
          </Button>
          <Button onClick={() => openModal(MODAL.ITEM_CREATE)} className="rounded-xl">
            <Plus /> Add Store Item
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCardSmall
          title="Total Items"
          value={<span className="text-2xl font-bold text-primary">{loading ? "—" : totalCount}</span>}
          subtitle={`In Stock: ${totalInStock}`}
        />
        <CustomerStatCardSmall
          title="In Stock"
          value={<span className="text-2xl font-bold text-green-600">{loading ? "—" : totalInStock}</span>}
          subtitle="Available"
        />
        <CustomerStatCardSmall
          title="Out of Stock"
          value={<span className="text-2xl font-bold text-red-600">{loading ? "—" : totalOutOfStock}</span>}
          subtitle="Needs reorder"
        />
        <CustomerStatCardSmall
          title="Total Value"
          value={<span className="text-2xl font-bold text-primary">{loading ? "—" : formatValue(totalValue)}</span>}
          subtitle="Based on cost price"
        />
      </div>

      <CustomModal
        title="Add New Store Item"
        module={MODULES.PRODUCTS}
        open={isOpen(MODAL.ITEM_CREATE)}
        onOpenChange={(open) => (open ? openModal(MODAL.ITEM_CREATE) : closeModal(MODAL.ITEM_CREATE))}
      >
        <ItemForm />
      </CustomModal>
    </div>
  );
}

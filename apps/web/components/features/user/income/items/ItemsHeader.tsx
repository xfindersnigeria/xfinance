"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import ItemsStatCardSmall from "./ItemsStatCardSmall";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ItemsForm from "./ItemsForm";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { ItemsResponse } from "./utils/types";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ItemsHeaderProps {
  data?: ItemsResponse;
  loading?: boolean;
}

/**
 * Header section for Items page
 * Displays title, stats cards, and create button
 * Manages create item modal
 */
export default function ItemsHeader({ data, loading }: ItemsHeaderProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const sym = useEntityCurrencySymbol();

  const totalCount = data?.totalItems || 0;
  const totalServices = data?.serviceItems || 0;
  const totalGoods = data?.goodsItems || 0;
  const avgPrice = data?.avgPrice || 0;

  return (
    <div className="mb-6">
      {/* Title and Actions */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Items</h2>
          <p className="text-muted-foreground">
            Manage service and non-inventory items for invoicing ({totalCount} items)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl" disabled>
            <Download />
            Export
          </Button>
          <Button
            onClick={() => openModal(MODAL.ITEM_CREATE)}
            className="rounded-xl"
          >
            <Plus /> Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ItemsStatCardSmall
          title="Total Items"
          value={<span className="text-2xl font-bold text-primary">{totalCount}</span>}
          subtitle="Active items"
        />
        <ItemsStatCardSmall
          title="Service Items"
          value={<span className="text-2xl font-bold text-blue-600">{totalServices}</span>}
          subtitle="Non-inventory services"
        />
        <ItemsStatCardSmall
          title="Goods Items"
          value={<span className="text-2xl font-bold text-purple-600">{totalGoods}</span>}
          subtitle="Inventory goods"
        />
        <ItemsStatCardSmall
          title="Avg Price"
          value={<span className="text-2xl font-bold text-primary">{sym}{avgPrice.toLocaleString()}</span>}
          subtitle="Average per item"
        />
      </div>

      {/* Create Item Modal */}
      <CustomModal
        title="Add New Item"
        module={MODULES.SALES}
        open={isOpen(MODAL.ITEM_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.ITEM_CREATE) : closeModal(MODAL.ITEM_CREATE)
        }
      >
        <ItemsForm />
      </CustomModal>
    </div>
  );
}

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { Plus, Download } from "lucide-react";
import StoreSupplyForm from "./StoreSupplyForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import StoreInventoryStatCardSmall from "./StoreInventoryStatCardSmall";
import { useStoreSupplyStats } from "@/lib/api/hooks/useAssets";

export default function StoreInventoryHeader() {
  const { isOpen, openModal, closeModal } = useModal();

  const { data, isLoading: statsLoading } = useStoreSupplyStats();
  // console.log(stats, "Fetched store supply stats:"); // Debug log to check fetched data
  const stats = (data as any) || {
    total: 0,
    totalValue: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  };
  return (
    <div className="mb-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Store Inventory
          </h2>
          <p className="text-muted-foreground">
            Manage office supplies and inventory
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button
            onClick={() => openModal(MODAL.SUPPLY_CREATE)}
            className="rounded-xl"
          >
            <Plus /> Add Supply
          </Button>
        </div>
      </div>
      {/* Stock Alert */}
      <div className="mb-4">
        <div className="flex items-center bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800">
          <span className="mr-3">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 9v4m0 4h.01M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <span className="font-semibold">Stock Alert:</span> {stats.lowStock}{" "}
            item(s) are low on stock and {stats.outOfStock} item(s) are out of
            stock.
            <br />
            <span className="text-sm text-muted-foreground">
              Review inventory levels and place orders to restock supplies.
            </span>
          </div>
        </div>
      </div>
      {/* Stat Cards */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StoreInventoryStatCardSmall
          title="Total Supplies"
          value={<span className="text-3xl">{stats.total}</span>}
          subtitle={`₦${stats.totalValue.toLocaleString()} value`}
        />
        <StoreInventoryStatCardSmall
          title="In Stock"
          value={<span className="text-3xl">{stats.inStock}</span>}
          subtitle="Adequate supply"
        />
        <StoreInventoryStatCardSmall
          title="Low Stock"
          value={<span className="text-3xl">{stats.lowStock}</span>}
          subtitle="Reorder needed"
        />
        <StoreInventoryStatCardSmall
          title="Out of Stock"
          value={<span className="text-3xl">{stats.outOfStock}</span>}
          subtitle="Urgent action"
        />
      </div>
      {/* Modal for create/edit supply */}
      <CustomModal
        title="Add New Supply"
        module={MODULES.ASSETS}
        open={isOpen(MODAL.SUPPLY_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.SUPPLY_CREATE)
            : closeModal(MODAL.SUPPLY_CREATE)
        }
      >
        <StoreSupplyForm closeModal={() => closeModal(MODAL.SUPPLY_CREATE)} />
      </CustomModal>
    </div>
  );
}

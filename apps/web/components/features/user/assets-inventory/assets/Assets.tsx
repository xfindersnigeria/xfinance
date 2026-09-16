"use client";
import React from "react";
import { useDebounce } from "use-debounce";
import { Download, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useAssets } from "@/lib/api/hooks/useAssets";
import AssetsHeader, { AssetSummary, AssetView } from "./AssetsHeader";
import AssetCategoriesTable from "./AssetCategoriesTable";
import AssetsForm from "./AssetsForm";
import { createAssetsColumns } from "./AssetsColumn";
import { downloadCsv, toDateInput } from "./utils/format";

const EMPTY_SUMMARY: AssetSummary = {
  total: 0,
  inUse: 0,
  inStorage: 0,
  totalCost: 0,
  depreciableValue: 0,
  uncategorised: 0,
  fullyDepreciated: 0,
};

export default function Assets() {
  const sym = useEntityCurrencySymbol();
  const { openModal, isOpen, closeModal } = useModal();
  const [view, setView] = React.useState<AssetView>("categories");
  const [categoryFilter, setCategoryFilter] = React.useState<{ id: string; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data: assetsResponse, isLoading: loading } = useAssets({
    search: debouncedSearchTerm,
    categoryId: categoryFilter?.id,
  });
  const assetsData = (assetsResponse as any)?.data?.assets || [];
  // Summary always covers every asset, regardless of search/filter
  const summary: AssetSummary = (assetsResponse as any)?.data?.summary || EMPTY_SUMMARY;

  const showRegister = (filter: { id: string; name: string } | null) => {
    setCategoryFilter(filter);
    setView("register");
  };

  const exportRegister = () => {
    downloadCsv(
      `asset-register-${toDateInput(new Date().toISOString())}.csv`,
      ["Asset", "Code", "Category", "Depr. %", "Purchase Date", "Purchase Cost", "Accumulated Depreciation", "Current Value", "Status"],
      assetsData.map((a: any) => [
        a.name,
        a.serialNumber,
        a.category?.name ?? "Uncategorised",
        a.category?.depreciationRate ?? "",
        toDateInput(a.purchaseDate),
        a.purchaseCost,
        a.accumulatedDepreciation,
        a.currentValue,
        a.status === "in_storage" ? "In Storage" : "In Use",
      ]),
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <AssetsHeader
        summary={summary}
        loading={loading}
        view={view}
        onViewChange={setView}
        onReviewUncategorised={() => showRegister({ id: "uncategorised", name: "Uncategorised" })}
      />

      {view === "categories" ? (
        <AssetCategoriesTable onSelectCategory={showRegister} />
      ) : (
        <CustomTable
          searchPlaceholder="Search assets by name, code or category"
          tableTitle="Detailed Asset Register"
          columns={createAssetsColumns(sym)}
          data={assetsData}
          pageSize={10}
          loading={loading}
          onSearchChange={setSearchTerm}
          display={{ searchComponent: true }}
          headerActions={
            <>
              {categoryFilter && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setCategoryFilter(null)}
                >
                  Clear filter ({categoryFilter.name}) <X className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={exportRegister}
                disabled={!assetsData.length}
              >
                <Download /> Export
              </Button>
              <Button className="rounded-2xl" onClick={() => openModal(MODAL.ASSET_CREATE)}>
                <Plus /> New Asset
              </Button>
            </>
          }
        />
      )}

      <CustomModal
        title="Register New Fixed Asset"
        description="Record an asset for tracking, valuation, and automatic depreciation computation."
        module={MODULES.ASSETS}
        open={isOpen(MODAL.ASSET_CREATE)}
        onOpenChange={(v) => (v ? openModal(MODAL.ASSET_CREATE) : closeModal(MODAL.ASSET_CREATE))}
      >
        <AssetsForm />
      </CustomModal>
    </div>
  );
}

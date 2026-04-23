import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Table } from "lucide-react";
import { Collection } from "@/lib/api/hooks/types/productsTypes";
import { MODAL } from "@/lib/data/modal-data";
import { useModal } from "@/components/providers/ModalProvider";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import CollectionsForm from "./CollectionsForm";
import React from "react";

const formatCurrency = (value: number, currency: string = "USD"): string => {
  const symbol = currency === "NGN" ? "₦" : "$";
  if (value >= 1_000_000_000) {
    return `${symbol}${value / 1_000_000_000}B`;
  } else if (value >= 1_000_000) {
    return `${symbol}${value / 1_000_000}M`;
  } else if (value >= 1_000) {
    return `${symbol}${value / 1_000}K`;
  }
  return `${symbol}${value}`;
};

interface CollectionCardGridProps {
  collections: Collection[];
  loading: boolean;
  currentPage: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onSearch: (value: string) => void;
  searchValue: string;
}

export default function CollectionCardGrid({
  collections,
  loading,
  currentPage,
  rowsPerPage,
  totalCount,
  onPageChange,
  onSearch,
  searchValue,
}: CollectionCardGridProps) {
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const { openModal, closeModal, isOpen } = useModal();
  const [selectedCollection, setSelectedCollection] =
    React.useState<Collection | null>(null);

  return (
    <>
      <div className="flex justify-end my-4">
        <div className="relative w-full max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <Input
            className="w-full pl-9"
            placeholder="Search collections..."
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded mb-4 w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No collections found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {collections.map((col) => (
              <div
                key={col.id}
                className="bg-white rounded-xl shadow-sm border p-4 flex flex-col relative hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-indigo-100 rounded-xl p-2 flex items-center justify-center">
                    <Table className="w-5 h-5 text-indigo-500" />
                  </div>
                  <span className="absolute top-4 right-4 bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full">
                    {col.totalItems} items
                  </span>
                </div>
                <div className="font-semibold text-lg text-gray-800 mb-0.5">
                  {col.name}
                </div>
                <div className="text-gray-400 text-sm mb-2 line-clamp-2">
                  {col.description}
                </div>
                {/* <div className="text-xs text-gray-400 mb-1">
                  Top selling products
                </div> */}
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <div className="text-xs text-gray-400">Total Value</div>
                    <div className="text-base font-semibold text-blue-700">
                      {formatCurrency(col.totalValue, "NGN")}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedCollection(col);
                      openModal(MODAL.COLLECTION_EDIT + "-" + col.id);
                    }}
                    className="border border-gray-200 rounded-xl px-4 py-2 font-semibold text-gray-700 bg-white hover:bg-gray-50 transition"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <CustomModal
        title="Add New Collection"
        module={MODULES.PRODUCTS}
        open={isOpen(MODAL.COLLECTION_EDIT + "-" + selectedCollection?.id)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.COLLECTION_EDIT + "-" + selectedCollection?.id)
            : closeModal(MODAL.COLLECTION_EDIT + "-" + selectedCollection?.id)
        }
      >
        <CollectionsForm collection={selectedCollection as any} isEditMode />
      </CustomModal>
    </>
  );
}

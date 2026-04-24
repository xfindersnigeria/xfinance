"use client";

import React, { useState } from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import StoreInventoryActions from "./StoreInventoryActions";
import { Box } from "lucide-react";
import { useModal } from "@/components/providers/ModalProvider";
import BulkIssueSuppliesForm from "./BulkIssueSuppliesForm";
import RestockForm from "./RestockForm";
import SingleIssueForm from "./SingleIssueForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import {
  useCreateStoreSupplyIssueBulk,
  useStoreSupplies,
} from "@/lib/api/hooks/useAssets";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useDebounce } from "use-debounce";
import { MODAL } from "@/lib/data/modal-data";
import { Button } from "@/components/ui/button";

// Dummy data for now
// const supplies = [
//   {
//     id: "1",
//     name: "A4 Paper (Ream)",
//     sku: "PP-A4-500",
//     category: "Paper & Stationery",
//     unitPrice: 3500,
//     qtyOnHand: 45,
//     minQty: 20,
//     totalValue: 157500,
//     status: "In Stock",
//   },
//   {
//     id: "2",
//     name: "Printer Toner Cartridge",
//     sku: "TN-HP-85A",
//     category: "Printer Supplies",
//     unitPrice: 28000,
//     qtyOnHand: 8,
//     minQty: 10,
//     totalValue: 224000,
//     status: "Low Stock",
//   },
//   {
//     id: "3",
//     name: "Ballpoint Pens (Box of 50)",
//     sku: "BP-50",
//     category: "Writing Instruments",
//     unitPrice: 5000,
//     qtyOnHand: 0,
//     minQty: 5,
//     totalValue: 0,
//     status: "Out of Stock",
//   },
// ];

function RestockCell({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const key = `${MODAL.SUPPLY_RESTOCK}-${row.id}`;
  return (
    <>
      <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 px-2" onClick={() => openModal(key)}>
        Restock
      </Button>
      <CustomModal
        title={`Restock: ${row.name}`}
        open={isOpen(key)}
        onOpenChange={(open) => (open ? openModal(key) : closeModal(key))}
        module={MODULES.ASSETS}
      >
        <RestockForm row={row} onCancel={() => closeModal(key)} />
      </CustomModal>
    </>
  );
}

function IssueCell({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const key = `${MODAL.SUPPLY_ISSUE_SINGLE}-${row.id}`;
  return (
    <>
      <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 px-2 text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => openModal(key)}>
        Issue
      </Button>
      <CustomModal
        title={`Issue: ${row.name}`}
        open={isOpen(key)}
        onOpenChange={(open) => (open ? openModal(key) : closeModal(key))}
        module={MODULES.ASSETS}
      >
        <SingleIssueForm row={row} onCancel={() => closeModal(key)} />
      </CustomModal>
    </>
  );
}

export default function StoreInventoryTable() {
  const { openModal, isOpen, closeModal } = useModal();
  const sym = useEntityCurrencySymbol();
  const [searchTerm, setSearchTerm] = React.useState("");

  const columns = [
    {
      key: "name",
      title: "Item Name",
      render: (value: any, row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500">{row.sku}</div>
        </div>
      ),
    },
    {
      key: "category",
      title: "Category",
    },
    {
      key: "unitPrice",
      title: "Unit Price",
      render: (value: any) => `${sym}${value.toLocaleString()}`,
    },
    {
      key: "quantity",
      title: "Qty on Hand",
      render: (value: any) => <span className="font-bold">{value}</span>,
    },
    {
      key: "minQuantity",
      title: "Min. Qty",
    },
    {
      key: "totalValue",
      title: "Total Value",
      render: (value: any, row: any) => {
        return new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: "NGN",
        }).format(row.unitPrice * row.quantity);
      },
    },
    {
      key: "status",
      title: "Status",
      render: (value: any) => {
        if (value === "in stock")
          return (
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium text-xs">
              In Stock
            </span>
          );
        if (value === "low stock")
          return (
            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium text-xs">
              Low Stock
            </span>
          );
        if (value === "out of stock")
          return (
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium text-xs">
              Out of Stock
            </span>
          );
        return value;
      },
    },
    {
      key: "restock",
      title: "Restock",
      render: (_: any, row: any) => <RestockCell row={row} />,
      searchable: false,
    },
    {
      key: "issue",
      title: "Issue",
      render: (_: any, row: any) => <IssueCell row={row} />,
      searchable: false,
    },
    {
      key: "actions",
      title: "",
      render: (_: any, row: any) => <StoreInventoryActions row={row} />,
      searchable: false,
    },
  ];
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selected, setSelected] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const { data: storeSupplies, isPending } = useStoreSupplies({
    search: debouncedSearchTerm,
    page,
    limit: pageSize,
  });

  const createSupplyIssue = useCreateStoreSupplyIssueBulk();

  // console.log("Supplies data", storeSupplies?.data);
  const suppliesData = (storeSupplies as any)?.data || [];
  // Handler for opening modal with selected items
  const handleBulkIssue = (selectedRows: any[]) => {
    setSelected(selectedRows);
    openModal(MODAL.ISSUE_SUPPLIES);
    // setModalOpen(true);
  };

  const handleModalClose = () => {
    // setModalOpen(false);
    closeModal(MODAL.ISSUE_SUPPLIES);
    setSelected([]);
  };

  const handleBulkIssueSubmit = (payload: any) => {
    try {
      createSupplyIssue.mutate(payload);
      // handleModalClose();
    } catch (error) {
      console.error("Error issuing supplies:", error);
    }
  };

  const pagination = (storeSupplies as any)?.pagination;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  return (
    <div className="space-y-4">
      <CustomTable
        tableTitle="Supplies Inventory"
        columns={columns}
        data={suppliesData}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search supplies..."
        display={{ searchComponent: true, filterComponent: true }}
        pageSize={10}
        selectionActionText={
          <span className="text-sm text-gray-600 flex items-center gap-1 text-white">
            <Box className="w-4 h-4" /> Bulk Issue
          </span>
        }
        selectableRows
        onSelectionAction={handleBulkIssue}
        pagination={{
          page,
          totalPages: pagination?.totalPages || 1,
          total: pagination?.total,
          onPageChange: setPage,
        }}
        loading={isPending}
      />
      <CustomModal
        open={isOpen(MODAL.ISSUE_SUPPLIES)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.ISSUE_SUPPLIES)
            : closeModal(MODAL.ISSUE_SUPPLIES)
        }
        title="Bulk Issue Supplies"
        description={`Issue ${selected.length} item(s) at once`}
        module={MODULES.ASSETS}
      >
        <BulkIssueSuppliesForm
          selectedItems={selected}
          isLoading={createSupplyIssue.isPending}
          onSubmit={handleBulkIssueSubmit}
          onCancel={handleModalClose}
        />
      </CustomModal>
    </div>
  );
}

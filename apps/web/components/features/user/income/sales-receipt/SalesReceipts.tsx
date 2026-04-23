"use client";
import { CustomTable } from "@/components/local/custom/custom-table";
import { useState, useMemo } from "react";
import { useReceipts } from "@/lib/api/hooks/useSales";
import { useDebounce } from "use-debounce";
import { getSalesReceiptColumns } from "./SalesReceiptColumns";
import SalesReceiptHeader from "./SalesReceiptHeader";
import { CustomModal } from "@/components/local/custom/modal";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import SalesReceiptDetails from "./details/SalesReceiptDetails";
import SalesReceiptsForm from "./SalesReceiptsForm";

export default function SalesReceipts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [methodFilter, setMethodFilter] = useState("All Methods");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { openModal, closeModal, isOpen } = useModal();
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const { data, isLoading } = useReceipts({
    search: debouncedSearchTerm,
    page: currentPage,
    limit: rowsPerPage,
    status: statusFilter === "All Statuses" ? undefined : statusFilter,
    paymentMethod: methodFilter === "All Methods" ? undefined : methodFilter,
  });
  const receipts = data?.receipts || [];

  const handleAction = (action: string, row: any) => {
    setSelectedReceipt(row);
    openModal(action); // actions use keys from MODAL
  };

  const columns = useMemo(() => getSalesReceiptColumns(handleAction), []);

  // console.log("Fetched receipts:", data); // Debug log to check fetched data
  return (
    <div className="space-y-4">
      <SalesReceiptHeader loading={isLoading} stats={(data as any)?.stats} />
      <CustomTable
        searchPlaceholder="Search receipts or customers..."
        tableTitle="Receipts List"
        columns={columns}
        data={receipts}
        pageSize={10}
        statusOptions={["All Statuses", "Completed", "Void"]}
        methodsOptions={[
          "All Methods",
          "Cash",
          "Card",
          "Bank_Transfer",
          "Mobile_Money",
          "Check",
          "Debit_Card",
          "Credit_Card",
          "ACH",
          "Wire_Transfer",
        ]}
        display={{
          statusComponent: true,
          filterComponent: false,
          searchComponent: true,
          methodsComponent: true,
        }}
        onStatusChange={setStatusFilter}
        onSearchChange={setSearchTerm}
        onMethodsChange={setMethodFilter}
        loading={isLoading}
      />

      {/* View Modal */}
      <CustomModal
        title="Receipt Details"
        description="View complete details of sales receipt"
        open={isOpen(MODAL.SALES_RECEIPT_VIEW)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.SALES_RECEIPT_VIEW)
            : closeModal(MODAL.SALES_RECEIPT_VIEW)
        }
        module={MODULES.SALES}
      >
        <SalesReceiptDetails receipt={selectedReceipt} />
      </CustomModal>

      {/* Edit Modal (Re-using wrapper logic if needed, or if SalesReceiptHeader handles Create, we handle Edit here) */}
      <CustomModal
        title={`Edit Receipt: ${selectedReceipt?.receiptNumber || ""}`}
        description="Modify receipt details"
        open={isOpen(MODAL.SALES_RECEIPT_EDIT)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.SALES_RECEIPT_EDIT)
            : closeModal(MODAL.SALES_RECEIPT_EDIT)
        }
        module={MODULES.SALES}
      >
        <SalesReceiptsForm
          receipt={
            selectedReceipt
              ? {
                  ...selectedReceipt,
                  lineItems:
                    typeof selectedReceipt.items?.[0] === "string"
                      ? selectedReceipt.items.map((i: string) => JSON.parse(i))
                      : selectedReceipt.items,
                }
              : undefined
          }
          isEditMode
        />
      </CustomModal>

      {/* Delete Modal - TODO: Implement if needed, currently just opens modal but no content in this snippet */}
    </div>
  );
}

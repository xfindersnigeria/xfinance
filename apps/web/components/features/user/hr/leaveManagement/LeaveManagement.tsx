"use client";
import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useLeaves } from "@/lib/api/hooks/useHR";
import { leaveManagementColumns } from "./LeaveManagementColumn";
import LeaveManagementHeader from "./LeaveManagementHeader";
import LeaveManagementForm from "./LeaveManagementForm";
import { useDebounce } from "use-debounce";

export default function LeaveManagement() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const { isOpen, openModal, closeModal } = useModal();

  const { data: leaveResponse, isLoading } = useLeaves({
    page,
    limit: pageSize,
    search: debouncedSearch,
  });

  const leaves = (leaveResponse as any)?.leaves || [];
  const stats = (leaveResponse as any)?.stats;
  const pagination = (leaveResponse as any)?.pagination;

  return (
    <div className="space-y-4">
      <LeaveManagementHeader stats={stats} loading={isLoading} />
      <CustomTable
        searchPlaceholder="Search leave requests..."
        tableTitle="Leave Requests"
        columns={leaveManagementColumns}
        data={leaves}
        pageSize={pageSize}
        loading={isLoading}
        onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
        display={{ searchComponent: true }}
        pagination={{
          page,
          totalPages: pagination?.totalPages || 1,
          total: pagination?.total,
          onPageChange: setPage,
        }}
        headerActions={
          <Button size="sm" className="rounded-2xl" onClick={() => openModal(MODAL.LEAVE_CREATE)}>
            <Plus className="w-4 h-4 mr-1" /> New Request
          </Button>
        }
      />

      <CustomModal
        title="New Leave Request"
        open={isOpen(MODAL.LEAVE_CREATE)}
        onOpenChange={(open) => open ? openModal(MODAL.LEAVE_CREATE) : closeModal(MODAL.LEAVE_CREATE)}
        module={MODULES.HR_PAYROLL}
        width="sm:max-w-2xl"
      >
        <LeaveManagementForm onSuccess={() => closeModal(MODAL.LEAVE_CREATE)} />
      </CustomModal>
    </div>
  );
}

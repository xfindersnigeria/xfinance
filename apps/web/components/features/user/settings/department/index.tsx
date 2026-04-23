"use client";
import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useDepartments } from "@/lib/api/hooks/useSettings";
import { departmentColumns } from "./DepartmentColumn";
import DepartmentForm from "./DepartmentForm";

export default function Department() {
  const { isOpen, openModal, closeModal } = useModal();
  const { data: response, isLoading } = useDepartments();
  const departments = (response as any)?.data ?? [];

  return (
    <>
      <CustomTable
        tableTitle="Departments"
        searchPlaceholder="Search departments..."
        columns={departmentColumns}
        data={departments}
        pageSize={10}
        loading={isLoading}
        display={{ searchComponent: false }}
        headerActions={
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => openModal(MODAL.DEPARTMENT_CREATE)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Dept
          </Button>
        }
      />

      <CustomModal
        title="Add Department"
        open={isOpen(MODAL.DEPARTMENT_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.DEPARTMENT_CREATE) : closeModal(MODAL.DEPARTMENT_CREATE)
        }
        module={MODULES.SETTINGS}
      >
        <DepartmentForm onSuccess={() => closeModal(MODAL.DEPARTMENT_CREATE)} />
      </CustomModal>
    </>
  );
}

"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
} from "lucide-react";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useDeleteEmployee } from "@/lib/api/hooks/useHR";
import EmployeeForm from "./EmployeeForm";
import EmployeeDetails from "./EmployeeDetails";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { Employee } from "./utils/types";

export default function EmployeesActions({ row }: { row: Employee }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  const deleteEmployee = useDeleteEmployee();

  const deleteKey = MODAL.EMPLOYEE_DELETE + "-" + row.id;
  const editKey = MODAL.EMPLOYEE_EDIT + "-" + row.id;
  const viewKey = MODAL.EMPLOYEE_VIEW + "-" + row.id;

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(deleteKey), 100);
  };

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(editKey), 100);
  };

  const handleViewClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(viewKey), 100);
  };

  const handleConfirm = (confirmed: boolean) => {
    if (confirmed) {
      deleteEmployee.mutate(row.id);
    }
    closeModal(deleteKey);
  };

  // Map API response to EmployeeForm fields
  // Helper to convert ISO date to 'YYYY-MM-DD'
  const toDateInput = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const employeeFormData = {
    ...row,
    jobTitle: row.position || row.jobTitle || "",
    hireDate: toDateInput(row.dateOfHire),
    dateOfBirth: toDateInput(row.dateOfBirth),
    baseSalary: row.salary ?? 0,
    annualLeaveDays: row.anualLeave ?? 0,
    payFrequency: row.perFrequency || "Monthly",
    emergencyContactName: row.emergencyContact?.contactName || "",
    emergencyContactPhone: row.emergencyContact?.contactPhone || "",
    emergencyContactRelationship: row.emergencyContact?.relationship || "",
    address: row.addressInfo?.address || "",
    city: row.addressInfo?.city || "",
    state: row.addressInfo?.province || "",
    postalCode: row.addressInfo?.postalCode || "",
    country: row.addressInfo?.country || "",
    allowances: row.allowances ?? 0,
    bankName: row.bankName || "",
    accountType: row.acountType || row.accountType || "Checking",
    accountNumber: row.accountNumber || "",
    routingNumber: row.routingNumber || "",
    note: row.note || "",
    employmentType: row.employmentType || "Full-time",
    profilePicture: row.profileImage?.secureUrl || undefined,
    reportsTo: row.reportingManager || "",
    currency: row.currency || "NGN - Nige",
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleViewClick();
            }}
          >
            <Eye className="size-4 mr-2" /> View Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleEditClick();
            }}
          >
            <Edit3 className="size-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
          >
            <Trash2 className="size-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CustomModal
        title={"Confirm Deletion"}
        open={isOpen(deleteKey)}
        onOpenChange={(open) =>
          open ? openModal(deleteKey) : closeModal(deleteKey)
        }
        module={MODULES.HR_PAYROLL}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete ${row.firstName} ${row.lastName}?`}
          onResult={handleConfirm}
          loading={deleteEmployee.isPending}
        />
      </CustomModal>
      <CustomModal
        title={`Edit Employee: ${row.firstName} ${row.lastName}`}
        open={isOpen(editKey)}
        onOpenChange={(open) =>
          open ? openModal(editKey) : closeModal(editKey)
        }
        module={MODULES.HR_PAYROLL}
      >
        <EmployeeForm employee={employeeFormData} isEditMode onSuccess={() => closeModal(editKey)} />
      </CustomModal>
      <CustomModal
        title={`Employee Profile: ${row.firstName} ${row.lastName}`}
        open={isOpen(viewKey)}
        onOpenChange={(open) =>
          open ? openModal(viewKey) : closeModal(viewKey)
        }
        module={MODULES.HR_PAYROLL}
      >
        <EmployeeDetails employee={row} />
      </CustomModal>
    </>
  );
}

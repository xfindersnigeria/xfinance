"use client";

import { useState } from "react";
import { MoreVertical, Edit, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useUpdateExpenseStatus, useDeleteExpense } from "@/lib/api/hooks/usePurchases";
import ExpensesForm from "./ExpensesForm";

interface ExpenseActionsProps {
    expense: any;
}

export default function ExpenseActions({ expense }: ExpenseActionsProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { isOpen, openModal, closeModal } = useModal();

    const updateExpenseStatus = useUpdateExpenseStatus();
    const deleteExpense = useDeleteExpense();

    const deleteKey = MODAL.EXPENSE_DELETE + "-" + expense.id;
    const editKey = MODAL.EXPENSE_EDIT + "-" + expense.id;
    const approveKey = MODAL.EXPENSE_MARK_APPROVED + "-" + expense.id;

    const handleDeleteClick = () => {
        setDropdownOpen(false);
        setTimeout(() => openModal(deleteKey), 100);
    };

    const handleEditClick = () => {
        setDropdownOpen(false);
        setTimeout(() => openModal(editKey), 100);
    };

    const handleApproveClick = () => {
        setDropdownOpen(false);
        setTimeout(() => openModal(approveKey), 100);
    };

    const handleDeleteConfirm = (confirmed: boolean) => {
        if (confirmed) {
            deleteExpense.mutate(expense.id);
        }
        closeModal(deleteKey);
    };

    const handleApproveConfirm = (confirmed: boolean) => {
        if (confirmed) {
            updateExpenseStatus.mutate({ id: expense.id, status: "approved" });
        }
        closeModal(approveKey);
    };

    const isDraft = expense.status === "draft" || expense.status === "Draft";

    return (
        <>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                        <MoreVertical className="w-5 h-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    {isDraft && (
                        <>
                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault();
                                    handleEditClick();
                                }}
                            >
                                <Edit className="size-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault();
                                    handleApproveClick();
                                }}
                            >
                                <CheckCircle className="size-4 mr-2" /> Mark as Approved
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
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Confirmation Modal */}
            <CustomModal
                title="Confirm Deletion"
                open={isOpen(deleteKey)}
                onOpenChange={(open) =>
                    open ? openModal(deleteKey) : closeModal(deleteKey)
                }
                module={MODULES.PURCHASES}
            >
                <ConfirmationForm
                    title={`Are you sure you want to delete this expense (${expense?.reference || expense.id})?`}
                    onResult={handleDeleteConfirm}
                    loading={deleteExpense.isPending}
                />
            </CustomModal>

            {/* Approve Confirmation Modal */}
            <CustomModal
                title="Confirm Approval"
                open={isOpen(approveKey)}
                onOpenChange={(open) =>
                    open ? openModal(approveKey) : closeModal(approveKey)
                }
                module={MODULES.PURCHASES}
            >
                <ConfirmationForm
                    title={`Are you sure you want to approve this expense (${expense?.reference || expense.id})?`}
                    onResult={handleApproveConfirm}
                    loading={updateExpenseStatus.isPending}
                />
            </CustomModal>

            {/* Edit Modal */}
            <CustomModal
                title={`Edit Expense: ${expense?.reference || expense.id}`}
                open={isOpen(editKey)}
                onOpenChange={(open) =>
                    open ? openModal(editKey) : closeModal(editKey)
                }
                module={MODULES.PURCHASES}
            >
                <ExpensesForm expense={expense} isEditMode />
            </CustomModal>
        </>
    );
}

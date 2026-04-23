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
  CreditCard,
  Pause,
  Users,
  Trash2,
} from "lucide-react";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useDeleteGroup } from "@/lib/api/hooks/useGroup";
import { toast } from "sonner";
import { GroupForm } from "./GroupForm";
import { useRouter } from "next/navigation";
import { MODAL } from "@/lib/data/modal-data";
import { useModal } from "@/components/providers/ModalProvider";

interface GroupRow {
  id: string;
  groupName: string;
  groupCode: string;
  industry: string;
  plan: string;
  entities: number;
  users: number;
  mrr: string;
  status: string;
  lastActive: string;
}

export default function GroupsActions({ row }: { row: GroupRow }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();

  const deleteGroup = useDeleteGroup();

  const handleViewDetails = () => {
    setDropdownOpen(false);
    // router.push(`/groups/${row.id}`);
  };

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(MODAL.GROUP_EDIT + "-" + row.id), 100);
  };

  const handleViewBilling = () => {
    setDropdownOpen(false);
    // router.push(`/groups/${row.id}/billing`);
  };

  const handleSuspendClick = () => {
    setDropdownOpen(false);

    // setTimeout(() => openModal(MODAL.GROUP_SUSPEND), 100);
  };

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(MODAL.GROUP_DELETE + "-" + row.id), 100);
  };

  const handleConfirmDelete = (confirmed: boolean) => {
    if (confirmed) {
      deleteGroup.mutate(row.id);
    }
    closeModal(MODAL.GROUP_DELETE + "-" + row.id);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleViewDetails();
            }}
          >
            <Eye className="size-4 mr-2" /> View Group
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleEditClick();
            }}
          >
            <Edit3 className="size-4 mr-2" /> Edit details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleViewBilling();
            }}
          >
            <CreditCard className="size-4 mr-2" /> View billing
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleSuspendClick();
            }}
          >
            <Pause className="size-4 mr-2" /> Suspend group
          </DropdownMenuItem>
          <DropdownMenuItem
            data-variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
          >
            <Trash2 className="size-4 mr-2" /> Delete group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Modal */}
      <CustomModal
        title={`Edit Group: ${row.groupName}`}
        open={isOpen(MODAL.GROUP_EDIT + "-" + row.id)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.GROUP_EDIT + "-" + row.id) : closeModal(MODAL.GROUP_EDIT + "-" + row.id)
        }
        module={MODULES.GROUP}
      >
        <GroupForm group={row} isEditMode />
      </CustomModal>

      {/* Suspend Confirmation Modal */}
      <CustomModal
        title="Confirm Suspension"
        open={isOpen(MODAL.GROUP_SUSPEND + "-" + row.id)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.GROUP_SUSPEND + "-" + row.id)
            : closeModal(MODAL.GROUP_SUSPEND + "-" + row.id)
        }
        module={MODULES.GROUP}
      >
        <ConfirmationForm
          title={`Are you sure you want to suspend ${row.groupName}? They will lose access to all services.`}
          onResult={(confirmed) => {
            if (confirmed) {
              // TODO: Implement suspend API call
            }
            closeModal(MODAL.GROUP_SUSPEND + "-" + row.id);
          }}
          loading={false}
        />
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal
        title="Confirm Deletion"
        open={isOpen(MODAL.GROUP_DELETE + "-" + row.id)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.GROUP_DELETE + "-" + row.id) : closeModal(MODAL.GROUP_DELETE + "-" + row.id)
        }
        module={MODULES.GROUP}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete ${row.groupName}? This action cannot be undone.`}
          onResult={handleConfirmDelete}
          loading={deleteGroup.isPending}
        />
      </CustomModal>
    </>
  );
}

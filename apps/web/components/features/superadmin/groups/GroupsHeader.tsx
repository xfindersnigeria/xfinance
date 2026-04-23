"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { GroupForm } from "./GroupForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export function GroupsHeader() {
  const { openModal, closeModal, isOpen } = useModal();
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-sm text-muted-foreground">
            Manage all group organizations on the platform
          </p>
        </div>

        <Button
          size="sm"
          className="gap-2  w-fit"
          onClick={() => openModal(MODAL.GROUP_CREATE)}
        >
          <Plus className="h-4 w-4" />
          Add Group
        </Button>
      </div>

      <CustomModal
        title="Create New Group"
        description="Add a new group organization to the platform"
        open={isOpen(MODAL.GROUP_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.GROUP_CREATE) : closeModal(MODAL.GROUP_CREATE)
        }
        module={MODULES.GROUP}
      >
        <GroupForm />
      </CustomModal>
    </div>
  );
}

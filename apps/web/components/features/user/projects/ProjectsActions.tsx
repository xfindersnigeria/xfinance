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
import { MoreVertical, Eye, Edit3, Trash2 } from "lucide-react";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import ProjectsForm from "./ProjectsForm";
import { Project } from "./utils/types";

interface ProjectsActionsProps {
  row: Project;
}

/**
 * Action dropdown menu for project rows
 * Handles view, edit, and delete operations with modal integration
 */
export default function ProjectsActions({ row }: ProjectsActionsProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(MODAL.PROJECT_DELETE), 100);
  };

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(MODAL.PROJECT_EDIT + "-" + row.id), 100);
  };

  const handleViewClick = () => {
    setDropdownOpen(false);
    // TODO: Navigate to project details page or open view modal
    console.log("View project:", row.id);
  };

  const handleConfirm = (confirmed: boolean) => {
    if (confirmed) {
      // TODO: Replace with actual API call to delete project
      console.log("Delete project:", row.id);
    }
    closeModal(MODAL.PROJECT_DELETE);
  };

  return (
    <>
      {/* Dropdown Menu */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleViewClick} className="cursor-pointer">
            <Eye className="mr-2 h-4 w-4" />
            <span>View Project</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer">
            <Edit3 className="mr-2 h-4 w-4" />
            <span>Edit Project</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Modal */}
      <CustomModal
        title="Edit Project"
        module={MODULES.PROJECTS}
        open={isOpen(MODAL.PROJECT_EDIT + "-" + row.id)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.PROJECT_EDIT + "-" + row.id)
            : closeModal(MODAL.PROJECT_EDIT + "-" + row.id)
        }
      >
        <ProjectsForm project={row} isEditMode />
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal
        title="Delete Project"
        module={MODULES.PROJECTS}
        open={isOpen(MODAL.PROJECT_DELETE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.PROJECT_DELETE) : closeModal(MODAL.PROJECT_DELETE)
        }
      >
        <ConfirmationForm
          title={`Are you sure you want to delete "${row.name}"? This action cannot be undone.`}
          onResult={handleConfirm}
        />
      </CustomModal>
    </>
  );
}

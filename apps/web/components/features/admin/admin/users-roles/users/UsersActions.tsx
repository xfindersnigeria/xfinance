"use client"

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { User } from "../utils/types";

interface UsersActionsProps {
  user: User;
}

export default function UsersActions({ user }: UsersActionsProps) {
  const [open, setOpen] = useState(false);
  const { openModal } = useModal();

  const handleEdit = () => {
    setOpen(false);
    openModal(MODAL.ADMIN_USER_EDIT + "-" + user.id);
  };

  const handleDelete = () => {
    setOpen(false);
    openModal(MODAL.ADMIN_USER_DELETE + "-" + user.id);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

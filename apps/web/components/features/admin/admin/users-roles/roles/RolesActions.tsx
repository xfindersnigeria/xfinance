"use client"
import { useState } from "react";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Role } from "../utils/types";

interface RolesActionsProps {
  role: Role;
  onView?: (role: Role) => void;
  onEdit?: (role: Role) => void;
  onDelete?: (role: Role) => void;
}

export default function RolesActions({ role, onView, onEdit, onDelete }: RolesActionsProps) {
  const [open, setOpen] = useState(false);

  const handleView = () => {
    setOpen(false);
    onView?.(role);
  };

  const handleEdit = () => {
    setOpen(false);
    // System roles cannot be edited
    if (role.isSystem) {
      return;
    }
    onEdit?.(role);
  };

  const handleDelete = () => {
    setOpen(false);
    // System roles or roles with users assigned cannot be deleted
    if (role.isSystem || role.usersCount > 0) {
      return;
    }
    onDelete?.(role);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleView}>
          <Eye className="w-4 h-4 mr-2" />
          View
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleEdit}
          disabled={role.isSystem}
          className={role.isSystem ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={role.isSystem || role.usersCount > 0}
          className={`${
            role.isSystem || role.usersCount > 0 ? "opacity-50 cursor-not-allowed" : ""
          } text-red-600`}
          title={role.usersCount > 0 ? `Cannot delete: ${role.usersCount} user(s) assigned` : role.isSystem ? "Cannot delete system roles" : ""}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

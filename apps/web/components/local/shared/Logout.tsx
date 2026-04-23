"use client";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

export default function Logout({ onLogout }: { onLogout: () => void }) {
  return (
    <DropdownMenuItem
      className="cursor-pointer flex items-center gap-2"
      onClick={onLogout}
    >
      <LogOut className="w-4 h-4" />
      Logout
    </DropdownMenuItem>
  );
}

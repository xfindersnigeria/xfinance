"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { Edit3 } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import AssetsForm from "./AssetsForm";

export default function AssetsActions({ row }: { row: any }) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-gray-100"
        onClick={() => setEditOpen(true)}
      >
        <Edit3 className="w-5 h-5" />
      </Button>
      <CustomModal
        title={`Edit Asset: ${row.name}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        module={MODULES.SALES}
      >
        <AssetsForm
          assets={row}
          isEditMode
          onSuccess={() => setEditOpen(false)}
        />
      </CustomModal>
    </>
  );
}

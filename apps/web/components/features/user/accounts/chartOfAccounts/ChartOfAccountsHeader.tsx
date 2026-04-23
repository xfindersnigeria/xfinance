"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import ChartOfAccountsForm from "./ChartOfAccountsForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export default function ChartOfAccountsHeader({
  loading,
}: {
  loading: boolean;
}) {
  const { isOpen, openModal, closeModal } = useModal();
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Accounts</h2>
          <p className="text-muted-foreground">
            Manage chart of accounts, journal entries, and budgets{" "}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button> */}
          <Button
            onClick={() => openModal(MODAL.ACCOUNT_CREATE)}
            className="rounded-xl"
          >
            <Plus /> Add Account
          </Button>
        </div>
      </div>

      <CustomModal
        title="Add New Account"
        description="Add a new account to the Master Chart of Accounts"
        module={MODULES.ACCOUNTS}
        open={isOpen(MODAL.ACCOUNT_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.ACCOUNT_CREATE)
            : closeModal(MODAL.ACCOUNT_CREATE)
        }
      >
        <ChartOfAccountsForm />
      </CustomModal>
    </div>
  );
}

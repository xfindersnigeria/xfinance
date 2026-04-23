"use client";
import React from "react";
import BankingHeader from "./BankingHeader";
import BankAccountsCard from "./BankAccountsCard";
import { BankingTabs } from "./BankingTabs";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { CustomModal } from "@/components/local/custom/modal";
import BankForm from "./BankForm";
import { MODULES } from "@/lib/types/enums";
import { useBankingStats } from "@/lib/api/hooks/useBanking";

export default function Banking() {
  const { isOpen, closeModal } = useModal();
  const { data, isLoading } = useBankingStats();

  console.log("Banking stats data:", data); // Debug log to check the structure of the banking stats data

  return (
    <div className="flex flex-col gap-4 p-4">
      <BankingHeader data={data} loading={isLoading} />
      <BankAccountsCard />
      <BankingTabs />

      {/* Connect Bank Modal */}
      <CustomModal
        open={isOpen(MODAL.BANK_CONNECT)}
        onOpenChange={(open) => {
          if (!open) closeModal(MODAL.BANK_CONNECT);
        }}
        title="Add Bank Account Manually"
        description="Enter your bank account details below"
        module={MODULES.BANKING}
      >
        <BankForm />
      </CustomModal>
    </div>
  );
}


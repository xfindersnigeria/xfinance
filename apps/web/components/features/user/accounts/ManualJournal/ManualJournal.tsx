"use client";

import React from "react";
import { useJournals, useAccounts, usePostJournal } from "@/lib/api/hooks/useAccounts";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import ManualJournalHeader from "./ManualJournalHeader";
import ManualJournalForm from "./ManualJournalForm";
import { CustomTable } from "@/components/local/custom/custom-table";
import { getManualJournalColumns } from "./ManualJournalColumn";
import { useDebounce } from "use-debounce";

export default function ManualJournal() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedJournalId, setSelectedJournalId] = React.useState<string | null>(null);

  const { data: journalResponse, isLoading: loading } = useJournals({
    search: debouncedSearchTerm,
  });

  const { data: accountsResponse } = useAccounts({
    search: debouncedSearchTerm,
  });

  const postJournal = usePostJournal();
  const { openModal, closeModal, isOpen } = useModal();

  const journalData = (journalResponse as any) || [];
  const accountsData = (accountsResponse as any)?.data || [];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handlePostClick = (journalId: string) => {
    setSelectedJournalId(journalId);
    openModal(MODAL.JOURNAL_POST);
  };

  const handleConfirmPost = async (confirmed: boolean) => {
    if (confirmed && selectedJournalId) {
      await postJournal.mutateAsync(selectedJournalId);
      closeModal(MODAL.JOURNAL_POST);
      setSelectedJournalId(null);
    } else {
      closeModal(MODAL.JOURNAL_POST);
      setSelectedJournalId(null);
    }
  };

  const manualJournalColumns = getManualJournalColumns(handlePostClick);
  const selectedJournal = journalData.find((j: any) => j.id === selectedJournalId);

  return (
    <div className="space-y-4">
      <ManualJournalHeader loading={loading} />

      <ManualJournalForm accounts={accountsData} />

      <CustomTable
        searchPlaceholder="Search journal entries..."
        tableTitle="Journal Entries"
        columns={manualJournalColumns}
        data={journalData as any}
        pageSize={10}
        loading={loading}
        onSearchChange={handleSearchChange}
        display={{ searchComponent: true }}
      />

      <CustomModal
        title="Post Journal Entry"
        open={isOpen(MODAL.JOURNAL_POST)}
        onOpenChange={(open) => !open && handleConfirmPost(false)}
        module={MODULES.ACCOUNTS}
      >
        <ConfirmationForm
          title={`Are you sure you want to post this journal entry?`}
          onResult={handleConfirmPost}
          confirmText="Post"
          cancelText="Cancel"
          loading={postJournal.isPending}
        />
      </CustomModal>
    </div>
  );
}

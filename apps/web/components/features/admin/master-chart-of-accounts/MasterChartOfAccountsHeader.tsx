"use client";

import React from "react";
import { Download, Upload, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { AccountForm } from "./AccountForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

interface MasterChartOfAccountsHeaderProps {
  onSearchChange?: (query: string) => void;
  onFilterChange?: (filter: string) => void;
  currentFilter?: string;
}

export function MasterChartOfAccountsHeader({
  onSearchChange,
  onFilterChange,
  currentFilter = "all",
}: MasterChartOfAccountsHeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const { isOpen, openModal, closeModal } = useModal();
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleFilterClick = (filter: string) => {
    onFilterChange?.(filter);
  };

  const filters = [
    { id: "all", label: "All Entities" },
    { id: "mapped", label: "Mapped Only" },
    { id: "unmapped", label: "Unmapped Only" },
  ];

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Master Chart of Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Group-level account structure with entity mappings
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => console.log("Import mappings")}
          >
            <Upload className="h-4 w-4" />
            Import Mappings
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => console.log("Export structure")}
          >
            <Download className="h-4 w-4" />
            Export Structure
          </Button>
          <Button
            size="sm"
            className="gap-2 "
            onClick={() => openModal(MODAL.ACCOUNT_CATEGORY_CREATE)}
          >
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleFilterClick(filter.id)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                currentFilter === filter.id
                  ? "bg-indigo-100 text-indigo-700 font-medium"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      <CustomModal
        title="Add New Account"
        description="Create a new account in the master chart with entity mappings"
        open={isOpen(MODAL.ACCOUNT_CATEGORY_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.ACCOUNT_CATEGORY_CREATE)
            : closeModal(MODAL.ACCOUNT_CATEGORY_CREATE)
        }
        module={MODULES.ACCOUNTS}
      >
        <AccountForm />
      </CustomModal>
    </div>
  );
}

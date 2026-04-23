"use client";

import React, { useEffect, useMemo, useState } from "react";
import VendorProfileHeader from "./VendorProfileHeader";
import VendorStatsCards from "./VendorStats";
import VendorTransactions from "./VendorTransactions";
import {
  VendorProfile,
  VendorStats,
  BillTransaction,
  VendorApiResponse,
  BillApiResponse,
} from "./types";
import { useVendor, useBills } from "@/lib/api/hooks/usePurchases";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { CustomModal } from "@/components/local/custom/modal";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import BillsForm from "../../bills/BillsForm";
import { MODULES } from "@/lib/types/enums";

// Mock Data (Fallback)
const mockProfile: VendorProfile = {
  id: "mock-id",
  vendorId: "VEN-001",
  name: "Office Supplies Co.",
  email: "sales@officesupplies.com",
  phone: "+1 (555) 123-4567",
  location: "New York, USA",
};

const mockStats: VendorStats = {
  outstandingBalance: 15000,
  totalBills: 52200,
  totalPayments: 45500,
  pendingBills: 1,
  transactionsCount: 12,
};

const mockTransactions: BillTransaction[] = [];

export default function VendorDetails() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params?.id ? params.id.toString() : "";
  const { openModal, isOpen, closeModal } = useModal();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: fetchedVendor,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useVendor(vendorId);

  console.log("Fetched vendor details:", fetchedVendor); // Debug log to check fetched data

  const {
    data: billsData,
    isLoading: billsLoading,
    refetch: refetchBills,
  } = useBills({
    limit: 100,
  });

  const vendorData = fetchedVendor as unknown as VendorApiResponse | undefined;

  // Derive Profile Data
  const profile: VendorProfile = useMemo(() => {
    if (!vendorData) return mockProfile;

    const locationParts = [
      vendorData.city,
      vendorData.province,
      vendorData.country,
    ].filter(Boolean);

    // Generate vendor ID from vendor name (e.g., "Office Supplies Co" -> "OSC")
    const vendorCode = vendorData.name
      .split(" ")
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    return {
      id: vendorData.id,
      vendorId: `VEN-${vendorCode}`,
      name: vendorData.name || mockProfile.name,
      email: vendorData.email || mockProfile.email,
      phone: vendorData.phone || mockProfile.phone,
      location: locationParts.length > 0 ? locationParts.join(", ") : mockProfile.location,
    };
  }, [vendorData]);

  // Derive Transactions Data from Bills Hook (filter by vendor ID)
  const transactions: BillTransaction[] = useMemo(() => {
    const allBills = (billsData as any)?.bills || [];
    
    // Filter bills for this vendor only
    const vendorBills = allBills.filter(
      (bill: any) => bill.vendorId === vendorId || bill.vendor?.id === vendorId
    );

    // Calculate running balance
    let runningBalance = 0;
    return vendorBills.map((bill: any) => {
      // For bills, amount is added to balance (money you owe)
      // For payments, amount is subtracted (money you paid)
      if (bill.status === "Paid" || bill.type === "Payment") {
        runningBalance -= bill.total;
      } else {
        runningBalance += bill.total;
      }

      return {
        id: bill.id,
        date: bill.billDate || bill.createdAt,
        type: bill.status === "Paid" ? "Payment" : "Bill",
        reference: bill.billNumber,
        description: bill.notes || `Bill ${bill.billNumber}`,
        amount: bill.total,
        dueDate: bill.dueDate,
        balance: runningBalance,
        status: (bill.status === "Draft" ? "Pending" : bill.status) as any,
      };
    });
  }, [billsData, vendorId]);

  // Derive Stats Data
  const stats: VendorStats = useMemo(() => {
    if (transactions.length === 0) return mockStats;
    
    let totalBills = 0;
    let totalPayments = 0;
    let outstandingBalance = 0;
    let pendingCount = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === "Payment") {
        totalPayments += transaction.amount;
      } else {
        totalBills += transaction.amount;
        if (transaction.status !== "Paid") {
          outstandingBalance += transaction.amount;
          if (transaction.status === "Pending") {
            pendingCount++;
          }
        }
      }
    });

    return {
      outstandingBalance: outstandingBalance,
      totalBills: totalBills,
      totalPayments: totalPayments,
      pendingBills: pendingCount,
      transactionsCount: transactions.length,
    };
  }, [transactions]);

  const handleOpenBillForm = () => {
    openModal(MODAL.BILL_CREATE);
  };

  const handleExportLedger = () => {
    // Implement ledger export functionality
    console.log("Export vendor ledger for:", vendorId);
  };

 

  if (vendorLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (vendorError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Failed to load vendor details. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button and Actions */}
      <div className="flex items-center justify-between gap-4">
        <VendorProfileHeader profile={profile} />
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportLedger}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Ledger</span>
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={handleOpenBillForm}
          >
            <Plus className="w-4 h-4" />
            New Bill
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <VendorStatsCards stats={stats} />

      {/* Transactions Table */}
      <VendorTransactions transactions={transactions} loading={billsLoading} />

      {/* Bill Form Modal */}
      <CustomModal
        title="Create New Bill"
        description="Create a new bill for this vendor"
        open={isOpen(MODAL.BILL_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.BILL_CREATE) : closeModal(MODAL.BILL_CREATE)
        }
        module={MODULES.PURCHASES}
      >
        <BillsForm />
      </CustomModal>
    </div>
  );
}

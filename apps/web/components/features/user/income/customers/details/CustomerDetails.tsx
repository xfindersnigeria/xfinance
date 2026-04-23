"use client";

import React, { useEffect, useMemo } from "react";
import CustomerProfileHeader from "./CustomerProfileHeader";
import CustomerStatsCards from "./CustomerStats";
import CustomerTransactions from "./CustomerTransactions";
import {
    CustomerProfile,
    CustomerStats,
    Transaction,
    CustomerApiResponse,
    InvoiceApiResponse,
} from "./types";
import { useCustomer, useInvoices } from "@/lib/api/hooks/useSales";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { CustomModal } from "@/components/local/custom/modal";
import InvoiceForm from "../../invoices/InvoiceForm";
import { MODULES } from "@/lib/types/enums";

// Mock Data (Fallback)
const mockProfile: CustomerProfile = {
    id: "mock-id",
    name: "Acme Corporation",
    companyName: "AC",
    email: "contact@acme.com",
    phone: "+1 (555) 123-4567",
    location: "New York, USA",
};

const mockStats: CustomerStats = {
    currentBalance: 45000,
    totalInvoiced: 100000,
    totalPaid: 55000,
    lifetimeValue: 100000,
    transactionsCount: 8,
};

const mockTransactions: Transaction[] = []; // Empty default

export default function CustomerDetails() {
    const router = useRouter();
    const params = useParams();
    const customerId = params?.id ? params.id.toString() : "";
    const { openModal, isOpen, closeModal } = useModal();

    const {
        data: fetchedCustomer,
        isLoading: customerLoading,
        isError: customerError,
    } = useCustomer(customerId);

    const {
        data: invoicesData,
        isLoading: invoicesLoading
    } = useInvoices({
        customerId: customerId,
        limit: 100, // Fetch more since we are showing them all in the table for now, or implement pagination
    });

    const customerData = fetchedCustomer as unknown as CustomerApiResponse | undefined;

    // Derive Profile Data
    const profile: CustomerProfile = useMemo(() => {
        if (!customerData) return mockProfile;

        const locationParts = [customerData.city, customerData.state, customerData.country].filter(Boolean);

        return {
            id: customerData.id,
            name: customerData.name || mockProfile.name,
            companyName: customerData.companyName || mockProfile.companyName,
            email: customerData.email || mockProfile.email,
            phone: customerData.phoneNumber || mockProfile.phone,
            location: locationParts.length > 0 ? locationParts.join(", ") : mockProfile.location,
        };
    }, [customerData]);

    // Derive Transactions Data from Invoices Hook (Server-side search)
    const transactions: Transaction[] = useMemo(() => {
        // If we have invoices data from usage of useInvoices, use that.
        // Otherwise fallback to empty or mock if needed.
        const invoices = (invoicesData as any)?.invoices || [];

        return invoices.map((inv: any) => ({
            id: inv.id,
            date: inv.invoiceDate,
            type: "Invoice",
            reference: inv.invoiceNumber,
            description: inv.notes || `Invoice ${inv.invoiceNumber}`,
            debit: inv.total,
            balance: 0,
            status: (inv.status === "Sent" ? "Pending" : inv.status) as any,
        }));
    }, [invoicesData]);

    // Derive Stats Data (Hybrid of real + mock where missing)
    const stats: CustomerStats = useMemo(() => {
        if (!customerData) return mockStats;

        // Calculate total invoiced from available invoices
        const calculatedTotalInvoiced = customerData.invoice?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

        return {
            currentBalance: mockStats.currentBalance, // Hardcoded as requested
            totalInvoiced: calculatedTotalInvoiced > 0 ? calculatedTotalInvoiced : mockStats.totalInvoiced,
            totalPaid: mockStats.totalPaid, // Hardcoded
            lifetimeValue: mockStats.lifetimeValue, // Hardcoded
            transactionsCount: (customerData.invoice?.length || 0), // Use real count
        };
    }, [customerData, transactions]);


    if (customerLoading) {
        return <div className="p-6 space-y-6">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-64 w-full" />
        </div>
    }

    if (customerError) {
        return <div className="p-6 text-red-500">Failed to load customer details.</div>
    }

    return (
        <div className="">
            <CustomerProfileHeader
                profile={profile}
                onCreateInvoice={() => openModal(MODAL.INVOICE_CREATE)}
            />
            <CustomerStatsCards stats={stats} />
            <CustomerTransactions
                transactions={transactions}
                loading={invoicesLoading}
            />

            <CustomModal
                title="Create New Invoice"
                description="Create a new invoice for this customer"
                open={isOpen(MODAL.INVOICE_CREATE)}
                onOpenChange={(open) =>
                    open ? openModal(MODAL.INVOICE_CREATE) : closeModal(MODAL.INVOICE_CREATE)
                }
                module={MODULES.SALES}
            >
                <InvoiceForm
                    defaultCustomerId={customerId}
                    disabledCustomerSelect={true}
                />
            </CustomModal>
        </div>
    );
}

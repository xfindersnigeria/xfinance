"use client";

import React, { useEffect } from "react";
import InvoiceDetailsHeader from "./InvoiceDetailsHeader";
import InvoiceInfo from "./InvoiceInfo";
import BillTo from "./BillTo";
import LineItemsTable from "./LineItemsTable";
import SummarySection from "./SummarySection";
import NotesAndBank from "./NotesAndBank";
import ActivityTimeline from "./ActivityTimeline";
import { useRouter, useParams } from "next/navigation";
import { useInvoice } from "@/lib/api/hooks/useSales";
import Loader from "@/app/loading";
import { useEntity } from "@/lib/api/hooks/useEntity";

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id ? params.id.toString().toUpperCase() : undefined;

  // fetch invoice using hook and log response for inspection
  const {
    data: fetchedInvoice,
    isLoading: invoiceLoading,
    isError,
  } = useInvoice(invoiceId || "");

  const {
    data: fetchedEntity,
    isLoading: entityLoading,
    isError: entityError,
  } = useEntity((fetchedInvoice as any)?.entityId || "");

  console.log("Fetched Entity:", fetchedEntity);

  // Build company info from fetchedEntity or use defaults
  const company = fetchedEntity
    ? {
        name: fetchedEntity.name || "Company Name",
        address: fetchedEntity.address || "",
        city: fetchedEntity.city || "",
        country: fetchedEntity.country || "",
        email: fetchedEntity.email || "",
        phone: fetchedEntity.phoneNumber || "",
        logo: (fetchedEntity as any).logo?.secureUrl ? (
          <img
            src={(fetchedEntity as any).logo.secureUrl}
            alt={(fetchedEntity as any).name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            {(fetchedEntity as any).name?.charAt(0) || "C"}
          </div>
        ),
      }
    : {
        name: "Hunslow Inc.",
        address: "525 Market Street, Suite 3500",
        city: "San Francisco, CA 94105",
        country: "United States",
        email: "billing@hunslow.com",
        phone: "+1 (415) 555-0123",
        logo: (
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            H
          </div>
        ),
      };

  const sampleBank = {
    bankName: "Wells Fargo Bank",
    accountName: "Hunslow Inc.",
    accountNumber: "****7892",
    routingNumber: "121000248",
    swiftCode: "WFBIUS65",
  };

  const mappedLineItems = ((fetchedInvoice as any)?.invoiceItem || []).map(
    (ii: any) => {
      const qty = Number(ii.quantity) || 0;
      const rate = Number(ii.rate) || 0;
      return {
        id: ii.id,
        description: ii?.item?.name || "Item",
        details: "",
        quantity: qty,
        rate,
        amount: qty * rate,
      };
    },
  );

  const subtotalVal = mappedLineItems.reduce(
    (s: number, li: any) => s + (li.amount || 0),
    0,
  );
  const taxVal = Math.round(subtotalVal * 0.1);
  const totalVal = subtotalVal + taxVal;

  const invoice = (fetchedInvoice as any)
    ? {
        id: (fetchedInvoice as any).id,
        invoiceNumber:
          (fetchedInvoice as any).invoiceNumber || (fetchedInvoice as any).id,
        status: (fetchedInvoice as any).status || "Draft",
        invoiceDate: (fetchedInvoice as any).invoiceDate
          ? new Date((fetchedInvoice as any).invoiceDate).toLocaleDateString()
          : "",
        dueDate: (fetchedInvoice as any).dueDate
          ? new Date((fetchedInvoice as any).dueDate).toLocaleDateString()
          : "",
        poNumber: (fetchedInvoice as any).poNumber || "PO-45892",
        paymentTerms: (fetchedInvoice as any).paymentTerms || "",
        taxId: fetchedEntity?.taxId || (fetchedInvoice as any).taxId || "",
        company,
        billTo: {
          name: (fetchedInvoice as any).customer?.name || "",
          attn: (fetchedInvoice as any).customer?.name || "",
          address:
            (fetchedInvoice as any).customer?.address ||
            (fetchedInvoice as any).customer?.companyName ||
            "",
          city: (fetchedInvoice as any).customer?.city || "",
          country: (fetchedInvoice as any).customer?.country || "",
          email: (fetchedInvoice as any).customer?.email || "",
          phone: (fetchedInvoice as any).customer?.phoneNumber || "",
        },
        lineItems: mappedLineItems,
        subtotal: subtotalVal,
        tax: taxVal,
        total: totalVal || (fetchedInvoice as any).total || totalVal,
        balanceDue: (fetchedInvoice as any).balanceDue || subtotalVal,
        currency: (fetchedInvoice as any).currency || "USD",
        notes: (fetchedInvoice as any).notes || "",
        bankDetails: sampleBank,
        activity: (fetchedInvoice as any).activities
          ? (fetchedInvoice as any).activities.map((a: any) => ({
              id: a.id,
              action: a.activityType || "Updated",
              description: a.description || a.activityType || "Activity",
              date: a.createdAt ? new Date(a.createdAt).toLocaleString() : "",
              actor:
                a.user?.firstName && a.user?.lastName
                  ? a.user.firstName + " " + a.user.lastName
                  : "",
            }))
          : [],
      }
    : {
        // fallback sample (kept minimal)
        id: "inv-2025-1248",
        invoiceNumber: "INV-2025-1248",
        status: "Sent",
        invoiceDate: "2025-11-01",
        dueDate: "2025-11-30",
        poNumber: "PO-45892",
        paymentTerms: "Net 30",
        taxId: "94-1234567",
        company,
        billTo: {
          name: "Acme Corporation",
          attn: "John Smith",
          address: "789 Innovation Drive",
          city: "Austin, TX 78701",
          country: "United States",
          email: "john.smith@acme.com",
          phone: "+1 (512) 555-0198",
        },
        lineItems: [
          {
            id: "1",
            description: "Enterprise Software License",
            details: "Annual subscription - 50 users",
            quantity: 1,
            rate: 15000.0,
            amount: 15000.0,
          },
        ],
        subtotal: 15000.0,
        tax: 1500.0,
        total: 16500.0,
        balanceDue: 15000.0,
        currency: "USD",
        notes:
          "Thank you for your business! Payment is due within 30 days. Please include invoice number with your payment.",
        bankDetails: sampleBank,
        activity: [],
      };

  if (invoiceLoading) {
    return <Loader />;
  }

  console.log("Fetched Invoice:", fetchedInvoice);
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header with actions */}
      <InvoiceDetailsHeader invoice={invoice} onBack={() => router.back()} />

      {/* Main Content */}
      <div className="space-y-4 ">
        {/* Main Invoice Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8 mb-6">
          {/* Header: Invoice title & details on right */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-8 mb-6 sm:mb-12">
            <div className="flex-1">
              {" "}
              <div>
                <div className="flex items-center mb-4 gap-2">
                  {invoice.company.logo}
                  <div>
                    <h3 className="font-semibold text-base text-gray-900">
                      {invoice.company.name}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {invoice.company.address}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {invoice.company.city}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {invoice.company.country}
                </p>
                <p className="text-sm text-blue-600 mb-1">
                  {invoice.company.email}
                </p>
                <p className="text-sm text-gray-600">{invoice.company.phone}</p>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                INVOICE
              </div>
              <InvoiceInfo invoice={invoice} />
            </div>
          </div>

          {/* Company & Bill To Section */}
          <div className="border-t pt-6 sm:pt-8 mb-6 sm:mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-8">
              {/* Right: Bill To */}
              <BillTo
                billTo={invoice.billTo}
                terms={invoice.paymentTerms}
                taxId={invoice.taxId}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <LineItemsTable
            items={invoice.lineItems}
            currency={invoice.currency}
          />

          {/* Summary Section */}
          <div className="mb-12">
            <SummarySection
              subtotal={invoice.subtotal}
              tax={invoice.tax}
              total={invoice.total}
              balanceDue={invoice.balanceDue}
              currency={invoice.currency}
            />
          </div>

          {/* Notes & Bank Details */}
          <NotesAndBank
            notes={invoice.notes}
            bankDetails={invoice.bankDetails}
          />

          {/* Footer */}
          <div className="text-center border-t pt-6 mt-12">
            <p className="text-sm text-gray-600 mb-2">
              Thank you for your business! For questions about this invoice,
              please contact{" "}
              <span className="text-blue-600">{invoice.company.email}</span>
            </p>
            <p className="text-xs text-gray-500">
              {invoice.company.name} • {invoice.company.address},{" "}
              {invoice.company.city}
            </p>
          </div>
        </div>

        {/* Activity Timeline Card */}
        <ActivityTimeline activities={invoice.activity} />
      </div>
    </div>
  );
}

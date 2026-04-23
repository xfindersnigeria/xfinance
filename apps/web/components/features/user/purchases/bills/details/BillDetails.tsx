"use client";

import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Printer, Download, Share2 } from "lucide-react";
import { useBill } from "@/lib/api/hooks/usePurchases";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

interface BillDetailsProps {
  bill: any;
}

export default function BillDetails({ bill }: BillDetailsProps) {
  const { openModal } = useModal();

  const paymentKey = MODAL.BILL_PAYMENT + "-" + bill.id;

  const getStatusBadge = (status: string) => {
    let badgeClass = "";
    if (status === "paid" || status === "Paid")
      badgeClass = "bg-green-100 text-green-700 hover:bg-green-100";
    else if (status === "unpaid" || status === "Unpaid")
      badgeClass = "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
    else if (status === "partial" || status === "Partial")
      badgeClass = "bg-blue-100 text-blue-700 hover:bg-blue-100";
    else badgeClass = "bg-gray-100 text-gray-700 hover:bg-gray-100";

    return (
      <Badge
        className={`${badgeClass} px-3 py-1 rounded-full text-xs font-medium capitalize`}
      >
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header Info */}
      <div className="bg-blue-50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bill #{bill.billNumber || bill.id}
          </h2>
          <p className="text-gray-500 text-sm">
            Created on{" "}
            {bill.billDate ? format(new Date(bill.billDate), "PPP") : "N/A"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(bill.status)}
          <Button variant="outline" size="icon" title="Print">
            <Printer className="size-4" />
          </Button>
          <Button variant="outline" size="icon" title="Download">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      {/* Bill Meta Data */}
      <div className="bg-green-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Vendor
          </h4>
          <p className="font-medium text-gray-900">
            {bill.vendor?.displayName || bill.vendor?.name || "N/A"}
          </p>
          <p className="text-sm text-gray-600">{bill.vendor?.email}</p>
          <p className="text-sm text-gray-600">{bill.vendor?.phoneNumber}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Dates
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bill Date:</span>
              <span className="text-gray-900 font-medium">
                {bill.billDate ? format(new Date(bill.billDate), "PP") : "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Due Date:</span>
              <span className="text-gray-900 font-medium">
                {bill.dueDate ? format(new Date(bill.dueDate), "PP") : "N/A"}
              </span>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Bill Summary
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">PO Number:</span>
              <span className="text-gray-900 font-medium">
                {bill.poNumber || "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Terms:</span>
              <span className="text-gray-900 font-medium">
                {bill.paymentTerms || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-yellow-50 rounded-xl p-4 border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b">
            <tr>
              <th className="px-4 py-3">Item / Description</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bill.items?.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {item.name || "Item"}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  $
                  {(Number(item.rate) || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  $
                  {(Number(item.total) || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Totals */}
      <div className="bg-white rounded-xl p-4 flex justify-end">
        <div className="w-full sm:w-64 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal:</span>
            <span>
              $
              {(Number(bill.total) - (Number(bill.tax) || 0)).toLocaleString(
                undefined,
                { minimumFractionDigits: 2 },
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax:</span>
            <span>
              $
              {(Number(bill.tax) || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2">
            <span>Total:</span>
            <span>
              $
              {(Number(bill.total) || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-blue-600">
            <span>Amount Due:</span>
            <span>
              $
              {(Number(bill.balanceDue) ?? Number(bill.total)).toLocaleString(
                undefined,
                { minimumFractionDigits: 2 },
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-purple-50 rounded-xl p-4 flex flex-col sm:flex-row gap-3 pt-6">
        {bill.status !== "paid" && (
          <Button
            className="flex-1 gap-2"
            onClick={() => openModal(paymentKey)}
          >
            <DollarSign className="size-4" /> Make Payment
          </Button>
        )}
        <Button variant="outline" className="flex-1 gap-2">
          <Share2 className="size-4" /> Remind Vendor
        </Button>
      </div>
    </div>
  );
}

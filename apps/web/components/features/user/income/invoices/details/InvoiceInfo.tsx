"use client";

interface InvoiceInfoProps {
  invoice: any;
}

export default function InvoiceInfo({ invoice }: InvoiceInfoProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
      <div className="flex flex-col gap-3">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Invoice Number</span>
          <p className="text-base font-semibold text-gray-900">
            {invoice.invoiceNumber}
          </p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Issue Date</span>
          <p className="text-base text-gray-900">{invoice.invoiceDate}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Due Date</span>
          <p className="text-base text-gray-900">{invoice.dueDate}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">PO Number</span>
          <p className="text-base text-gray-900">{invoice.poNumber}</p>
        </div>
      </div>
    </div>
  );
}

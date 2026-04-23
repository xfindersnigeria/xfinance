"use client";

interface BillToProps {
  billTo: any;
  terms: string;
  taxId: string;
}

export default function BillTo({ billTo, terms, taxId }: BillToProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 mb-3 text-sm">Bill To:</h4>
        <p className="text-sm text-gray-900 font-medium">{billTo.name}</p>
        <p className="text-xs text-gray-600 mb-2">Attn: {billTo.attn}</p>
        <p className="text-xs text-gray-600">{billTo.address}</p>
        <p className="text-xs text-gray-600 mb-1">{billTo.city}</p>
        <p className="text-xs text-gray-600 mb-1">{billTo.country}</p>
        <p className="text-xs text-blue-600 mb-1">{billTo.email}</p>
        <p className="text-xs text-gray-600">{billTo.phone}</p>
      </div>
      <div className="flex-1">
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Payment Terms:</h4>
          <p className="text-sm text-gray-900">{terms}</p>
        </div>
        <div>
          <span className="text-xs text-gray-600">Tax ID: </span>
          <span className="text-xs text-gray-900 font-medium">{taxId}</span>
        </div>
      </div>
    </div>
  );
}

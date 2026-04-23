"use client";

interface NotesAndBankProps {
  notes: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    swiftCode: string;
  };
}

export default function NotesAndBank({
  notes,
  bankDetails,
}: NotesAndBankProps) {
  return (
    <div className="border-t pt-6 sm:pt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
        {/* Notes Section */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Notes:</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{notes}</p>
        </div>

        {/* Bank Details Section */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4 text-sm">Bank Details:</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bank Name:</span>
              <span className="text-gray-900 font-medium">
                {bankDetails.bankName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Account Name:</span>
              <span className="text-gray-900 font-medium">
                {bankDetails.accountName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Account Number:</span>
              <span className="text-gray-900 font-medium">
                {bankDetails.accountNumber}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Routing Number:</span>
              <span className="text-gray-900 font-medium">
                {bankDetails.routingNumber}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">SWIFT Code:</span>
              <span className="text-gray-900 font-medium">
                {bankDetails.swiftCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

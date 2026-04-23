import React from "react";
import { Building2 } from "lucide-react";
import { BankAccountProfile } from "./types";

interface BankProfileHeaderProps {
  profile: BankAccountProfile;
}

export default function BankProfileHeader({
  profile,
}: BankProfileHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {profile.accountName}
          </h1>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Bank:</span> {profile.bankName}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Account Type:</span>{" "}
              {profile.accountType}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Account Number:</span>{" "}
              {profile.accountNumber?.slice(-4)
                ? `****${profile.accountNumber.slice(-4)}`
                : "****"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Current Balance</div>
          <div className="text-3xl font-bold text-gray-900">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: profile.currency,
            }).format(profile.currentBalance)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{profile.currency}</div>
        </div>
      </div>
    </div>
  );
}

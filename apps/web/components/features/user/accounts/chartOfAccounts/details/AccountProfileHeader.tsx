import React from "react";
import { ArrowLeft, Landmark } from "lucide-react";
import { AccountProfile } from "./types";
import { Button } from "@/components/ui/button";

interface AccountProfileHeaderProps {
  profile: AccountProfile;
    onBack: () => void;
}

export default function AccountProfileHeader({
  profile,
  onBack,
}: AccountProfileHeaderProps) {
  return (
    <>
    <div className="flex items-center justify-between w-full">
        {" "}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back to Accounts</span>
          <span className="sm:hidden">Back</span>
        </Button>
        {/* <Badge
          className={`${getStatusColor(invoice.status)} shrink-0  md:hidden`}
        >
          {invoice.status}
        </Badge> */}
      </div>
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
      
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center">
          <Landmark className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {profile.name}
          </h1>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Code:</span> {profile.code}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Type:</span> {profile.typeName}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Category:</span>{" "}
              {profile.categoryName}
            </p>
            {profile.description && (
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Description:</span>{" "}
                {profile.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

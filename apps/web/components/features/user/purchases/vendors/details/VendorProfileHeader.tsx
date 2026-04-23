"use client";

import React from "react";
import { Mail, Phone, MapPin, Building, FileText } from "lucide-react";
import { VendorProfile } from "./types";

interface VendorProfileHeaderProps {
  profile: VendorProfile;
}

export default function VendorProfileHeader({
  profile,
}: VendorProfileHeaderProps) {
  // Mock initials for avatar if no image
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center gap-4">
        {/* Avatar Placeholder */}
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
          {initials}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Building className="w-4 h-4 text-gray-400" />
              <span>Vendor ID: {profile.vendorId}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{profile.phone}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

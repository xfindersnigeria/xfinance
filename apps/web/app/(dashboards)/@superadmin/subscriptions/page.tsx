'use client';

import React from 'react';
import {
  SubscriptionManagementHeader,
  SubscriptionStatCards,
  SubscriptionManagementContent,
} from '@/components/features/superadmin/subscription-management';

export default function SubscriptionPage() {
  return (
    <div className="space-y-8 p-4">
      {/* Header with Create Plan button */}
      <SubscriptionManagementHeader />

      {/* Stat Cards */}
      <SubscriptionStatCards />

      {/* Plans and Settings Tabs */}
      <SubscriptionManagementContent />
    </div>
  );
}

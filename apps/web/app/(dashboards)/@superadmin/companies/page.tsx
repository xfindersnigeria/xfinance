'use client';

import React from 'react';
import {
  GroupsHeader,
  GroupsStatCards,
  GroupsContent,
} from '@/components/features/superadmin/groups';

export default function CompaniesPage() {
  return (
    <div className="space-y-8 p-4">
      {/* Header with Add Group button */}
      <GroupsHeader />

      {/* Stat Cards */}
      <GroupsStatCards />

      {/* Groups Table */}
      <GroupsContent />
    </div>
  );
}

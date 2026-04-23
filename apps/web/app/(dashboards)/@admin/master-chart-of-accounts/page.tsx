'use client';

import React from 'react';
import {
  MasterChartOfAccountsHeader,
  MasterChartOfAccountsContent,
} from '@/components/features/admin/master-chart-of-accounts';

export default function MasterChartOfAccountsPage() {
  const [currentFilter, setCurrentFilter] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="space-y-4 p-4">
      {/* Header with buttons, search, and filters */}
      <MasterChartOfAccountsHeader
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}
        onSearchChange={setSearchQuery}
      />

      {/* Main hierarchical account content */}
      <MasterChartOfAccountsContent />
    </div>
  );
}

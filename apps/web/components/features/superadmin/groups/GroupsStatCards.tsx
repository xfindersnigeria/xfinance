'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupStats } from '@/lib/api/hooks/useGroup';

interface StatCardProps {
  title: string;
  value: string;
  isLoading?: boolean;
  className?: string;
}

function StatCard({ title, value, isLoading = false, className = '' }: StatCardProps) {
  if (isLoading) {
    return (
      <div className={`border border-gray-200 rounded-lg bg-white p-6 ${className}`}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-8 w-16" />
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-lg bg-white p-6 ${className}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}

export function GroupsStatCards() {
  const { data: stats, isLoading } = useGroupStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard 
        title="Total Groups" 
        value={stats?.totalGroups?.toString() || '0'} 
        isLoading={isLoading}
      />
      <StatCard 
        title="Active" 
        value={stats?.activeGroups?.toString() || '0'} 
        isLoading={isLoading}
      />
      <StatCard 
        title="Trial" 
        value={stats?.trialGroups?.toString() || '0'} 
        isLoading={isLoading}
      />
      <StatCard 
        title="Suspended" 
        value={stats?.suspendedGroups?.toString() || '0'} 
        isLoading={isLoading}
      />
    </div>
  );
}

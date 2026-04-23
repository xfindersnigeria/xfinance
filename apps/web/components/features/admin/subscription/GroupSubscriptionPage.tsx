'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscriptionTiers, useCurrentSubscription } from '@/lib/api/hooks/useSubscription';
import { SubscriptionTierCard } from './SubscriptionTierCard';
import { CurrentSubscriptionCard } from './CurrentSubscriptionCard';
import { SubscriptionTier } from '@/lib/api/services/subscriptionService';

export function GroupSubscriptionPage() {
  const { data: tiers = [], isLoading: tiersLoading } = useSubscriptionTiers();
  const { data: currentSubscription } = useCurrentSubscription();

  if (tiersLoading) {
    return (
      <div className="space-y-8 p-4">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground">
            Choose the right plan for your organization
          </p>
        </div>

        {/* Current Subscription Skeleton */}
        <div>
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>

        {/* Plans Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3 border border-gray-200 rounded-lg p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-sm text-muted-foreground">
          Choose the right plan for your organization
        </p>
      </div>

      {/* Current Subscription Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Current Subscription</h2>
        <CurrentSubscriptionCard />
      </div>

      {/* Available Plans Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <SubscriptionTierCard
              key={tier.id}
              id={tier.id}
              name={tier.name}
              description={tier.description}
              maxUsers={tier.maxUsers}
              maxEntities={tier.maxEntities}
              monthlyPrice={tier.monthlyPrice || 0}
              yearlyPrice={tier.yearlyPrice || 0}
              customBranding={tier.customBranding || false}
              prioritySupport={tier.prioritySupport || false}
              subscriptionModules={tier.subscriptionModules}
              isCurrentPlan={currentSubscription?.subscriptionTierId === tier.id}
              currentTierId={currentSubscription?.subscriptionTierId}
            />
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="text-blue-900">
          <strong>Note:</strong> Upgrading your subscription will immediately apply the new limits and features. Your billing cycle will be adjusted accordingly.
        </p>
      </div>
    </div>
  );
}

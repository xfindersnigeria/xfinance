'use client';

import React, { useEffect, useState } from 'react';
import { CustomTabs, Tab } from '@/components/local/custom/tabs';
import { PlanCard } from './PlanCard';
import { SubscriptionSettingsTab } from './SubscriptionSettingsTab';
import { useSubscriptionTiers } from '@/lib/api/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function PlansTab({ plans, isLoading, error }: { plans: any[]; isLoading: boolean; error: any }) {

  useEffect(() => {
    if (plans) {
      console.log('✅ Plans loaded:', plans);
    }
  }, [plans]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <Skeleton key={idx} className="h-96 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load subscription plans. {error instanceof Error && error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {plans && plans.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              id={plan.id}
              name={plan.name}
              description={plan.description}
              maxUsers={plan.maxUsers}
              maxEntities={plan.maxEntities}
              // maxTransactionsMonth={plan.maxTransactionsMonth}
              // maxStorageGB={plan.maxStorageGB}
              // maxApiRatePerHour={plan.maxApiRatePerHour}
              // apiAccess={plan.apiAccess}
              // webhooks={plan.webhooks}
              // sso={plan.sso}
              monthlyPrice={plan.monthlyPrice}
              yearlyPrice={plan.yearlyPrice}
              customBranding={plan.customBranding}
              prioritySupport={plan.prioritySupport}
              subscriptionModules={plan.subscriptionModules}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No subscription plans found</p>
        </div>
      )}
    </div>
  );
}

export function SubscriptionManagementContent() {
  const { data: subPlans, isLoading, error } = useSubscriptionTiers();

  useEffect(() => {
    if (subPlans) {
      console.log('📊 Subscription tiers loaded:', {
        count: subPlans.length,
        tiers: subPlans.map(t => ({
          id: t.id,
          name: t.name,
          modules: t.subscriptionModules?.length || 0,
        }))
      });
    }
    if (error) {
      console.error('❌ Error loading tiers:', error);
    }
  }, [subPlans, error]);

  const tabs: Tab[] = [
    {
      title: 'Plans',
      value: 'plans',
      content: <PlansTab plans={subPlans || []} isLoading={isLoading} error={error} />,
    },
    {
      title: 'Settings',
      value: 'settings',
      content: <SubscriptionSettingsTab />,
    },
  ];

  return <CustomTabs tabs={tabs} storageKey="subscription-management-tab" />;
}

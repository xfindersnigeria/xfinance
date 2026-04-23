'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentSubscription } from '@/lib/api/hooks/useSubscription';

export function CurrentSubscriptionCard() {
  const { data: subscription, isLoading } = useCurrentSubscription();
  if (isLoading) {
    return (
      <Card className="border-2 border-blue-200 bg-blue-50 p-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="border-2 border-gray-200 bg-gray-50 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">No Active Subscription</h3>
          <p className="text-sm text-gray-600">
            Choose a plan below to get started with xFinance.
          </p>
        </div>
      </Card>
    );
  }

  const usagePercentage = (subscription?.usedUsers / subscription?.maxUsers * 100).toFixed(1);

  return (
    <Card className="border-2 border-blue-200 bg-blue-50 p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{subscription.tierName}</h3>
            <p className="text-sm text-gray-600 mt-1">Current Subscription</p>
          </div>
          <Badge
            className={`${
              subscription.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            } text-xs font-medium`}
          >
            {subscription.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Billing Period */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs text-gray-600">Billing Start</p>
            <p className="font-medium text-gray-900">
              {new Date(subscription.billingStartDate).toLocaleDateString('en-NG')}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs text-gray-600">Billing End</p>
            <p className="font-medium text-gray-900">
              {subscription.billingEndDate
                ? new Date(subscription.billingEndDate).toLocaleDateString('en-NG')
                : 'On-going'}
            </p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-white p-3 rounded-lg space-y-2">
          <p className="text-xs font-medium text-gray-600">Usage</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Users: {subscription.usedUsers} / {subscription.maxUsers}</span>
              <span className="text-xs font-medium text-blue-600">{usagePercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${subscription?.usage?.usersPercentage * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Allowed Modules */}
        {subscription?.tier?.subscriptionModules.length > 0 && (
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">Allowed Modules</p>
            <p className="text-xs text-gray-900">
              {subscription?.tier?.subscriptionModules.length} module(s) included
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

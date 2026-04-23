'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUpgradeSubscription } from '@/lib/api/hooks/useSubscription';

interface SubscriptionModule {
  moduleId: string;
  module: {
    id: string;
    moduleKey: string;
    displayName: string;
    scope?: string;
  };
}

interface SubscriptionTierCardProps {
  id: string;
  name: string;
  description?: string;
  maxUsers: number;
  maxEntities: number;
  monthlyPrice: number;
  yearlyPrice: number;
  customBranding: boolean;
  prioritySupport: boolean;
  subscriptionModules?: SubscriptionModule[];
  isCurrentPlan?: boolean;
  currentTierId?: string;
}

export function SubscriptionTierCard({
  id,
  name,
  description,
  maxUsers,
  maxEntities,
  monthlyPrice,
  yearlyPrice,
  customBranding,
  prioritySupport,
  subscriptionModules = [],
  isCurrentPlan = false,
  currentTierId,
}: SubscriptionTierCardProps) {
  const upgradeMutation = useUpgradeSubscription();
  const isCurrentOrHigher = isCurrentPlan;
  const isUpgrade = !isCurrentPlan && currentTierId !== id;

  const handleSubscribe = () => {
    upgradeMutation.mutate(id);
  };

  const features = [
    { name: 'Custom Branding', enabled: customBranding },
    { name: 'Priority Support', enabled: prioritySupport },
  ];

  const modules = subscriptionModules.map(sm => sm.module.displayName);

  return (
    <Card
      className={`border-2 p-6 flex flex-col transition-all ${
        isCurrentPlan
          ? 'border-green-500 bg-green-50 relative'
          : 'border-gray-200 bg-white hover:border-indigo-300'
      }`}
    >
      {isCurrentPlan && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-green-600 text-white">Current Plan</Badge>
        </div>
      )}

      <div className="space-y-4 flex-1">
        {/* Header */}
        <div className="space-y-1 pr-24 line-clamp-3">
          <h3 className="text-xl font-bold text-gray-900">{name}</h3>
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </div>

        <Separator />

        {/* Pricing */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900">Pricing</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-indigo-50 p-2 rounded">
              <p className="text-gray-600">Monthly</p>
              <p className="font-bold text-gray-900">
                {new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                }).format(monthlyPrice)}
              </p>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <p className="text-gray-600">Yearly</p>
              <p className="font-bold text-gray-900">
                {new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                }).format(yearlyPrice)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Usage Limits */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900">Usage Limits</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50 p-2 rounded">
              <p className="text-gray-600">Users</p>
              <p className="font-bold text-gray-900">{maxUsers}</p>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <p className="text-gray-600">Entities</p>
              <p className="font-bold text-gray-900">{maxEntities}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Features */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900">Features</p>
          <div className="space-y-1">
            {features.map((feature) => (
              <div key={feature.name} className="flex items-center gap-2 text-xs">
                {feature.enabled ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-gray-400" />
                )}
                <span className={feature.enabled ? 'text-gray-900' : 'text-gray-400'}>
                  {feature.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modules */}
        {modules.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">Included Modules</p>
              <div className="flex flex-wrap gap-1">
                {modules.map((module) => (
                  <Badge key={module} variant="secondary" className="text-xs">
                    {module}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Subscribe Button */}
      <div className="mt-6 pt-4 border-t">
        {isCurrentPlan ? (
          <Button disabled className="w-full" variant="outline">
            Current Plan
          </Button>
        ) : (
          <Button
            onClick={handleSubscribe}
            disabled={upgradeMutation.isPending}
            className="w-full bg-primary hover:bg-indigo-700 text-white"
          >
            {upgradeMutation.isPending ? 'Subscribing...' : 'Subscribe Now'}
          </Button>
        )}
      </div>
    </Card>
  );
}

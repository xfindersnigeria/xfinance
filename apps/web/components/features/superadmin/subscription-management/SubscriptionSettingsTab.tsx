'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscriptionSettings, useUpdateSubscriptionSettings } from '@/lib/api/hooks/useSubscription';

export function SubscriptionSettingsTab() {
  const { data: settings, isLoading } = useSubscriptionSettings();
  const { mutate: updateSettings, isPending } = useUpdateSubscriptionSettings();
  
  const [formData, setFormData] = React.useState<{
    trialPeriodEnabled: boolean;
    trialDurationDays: number | undefined;
    autoRenewalEnabled: boolean;
    proratePayments: boolean;
    gracePeriodDays: number | undefined;
    paymentReminders: boolean;
  }>({
    trialPeriodEnabled: false,
    trialDurationDays: 14,
    autoRenewalEnabled: true,
    proratePayments: true,
    gracePeriodDays: 3,
    paymentReminders: true,
  });

  // Sync form data with API data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData({
        trialPeriodEnabled: settings.trialPeriodEnabled,
        trialDurationDays: settings.trialDurationDays,
        autoRenewalEnabled: settings.autoRenewalEnabled,
        proratePayments: settings.proratePayments,
        gracePeriodDays: settings.gracePeriodDays,
        paymentReminders: settings.paymentReminders,
      });
    }
  }, [settings]);

  const handleToggle = (key: 'trialPeriodEnabled' | 'autoRenewalEnabled' | 'proratePayments' | 'paymentReminders') => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleInputChange = (key: 'trialDurationDays' | 'gracePeriodDays', value: number | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    const payload = {
      trialPeriodEnabled: formData.trialPeriodEnabled,
      trialDurationDays: formData.trialDurationDays ?? 0,
      autoRenewalEnabled: formData.autoRenewalEnabled,
      proratePayments: formData.proratePayments,
      gracePeriodDays: formData.gracePeriodDays ?? 0,
      paymentReminders: formData.paymentReminders,
    };
    updateSettings(payload);
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-200 p-6">
        <div className="space-y-8">
          <Skeleton className="h-6 w-48" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3 border-b border-gray-200 pb-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 p-6">
      <div className="space-y-8">
        <h3 className="text-lg font-semibold text-gray-900">Subscription Settings</h3>

        {/* Trial Period */}
        <div className="space-y-3 border-b border-gray-200 pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium text-gray-900">Trial Period</Label>
              <p className="text-sm text-gray-600">Allow new customers to try before buying</p>
            </div>
            <Switch
              checked={formData.trialPeriodEnabled}
              onCheckedChange={() => handleToggle('trialPeriodEnabled')}
            />
          </div>
        </div>

        {/* Trial Duration */}
        <div className="space-y-3 border-b border-gray-200 pb-6">
          <Label htmlFor="trial-duration" className="text-base font-medium text-gray-900">
            Trial Duration (Days)
          </Label>
          <NumberInput
            id="trial-duration"
            value={formData.trialDurationDays}
            onChange={(value) => handleInputChange('trialDurationDays', value)}
            className="w-32"
          />
        </div>

        {/* Auto-Renewal */}
        <div className="space-y-3 border-b border-gray-200 pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium text-gray-900">Auto-Renewal</Label>
              <p className="text-sm text-gray-600">Automatically renew subscriptions</p>
            </div>
            <Switch
              checked={formData.autoRenewalEnabled}
              onCheckedChange={() => handleToggle('autoRenewalEnabled')}
            />
          </div>
        </div>

        {/* Proration */}
        <div className="space-y-3 border-b border-gray-200 pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium text-gray-900">Proration</Label>
              <p className="text-sm text-gray-600">Prorate charges for plan changes</p>
            </div>
            <Switch
              checked={formData.proratePayments}
              onCheckedChange={() => handleToggle('proratePayments')}
            />
          </div>
        </div>

        {/* Grace Period */}
        <div className="space-y-3 border-b border-gray-200 pb-6">
          <Label htmlFor="grace-period" className="text-base font-medium text-gray-900">
            Grace Period
          </Label>
          <p className="text-sm text-gray-600">Days after payment failure before suspension</p>
          <NumberInput
            id="grace-period"
            value={formData.gracePeriodDays}
            onChange={(value) => handleInputChange('gracePeriodDays', value)}
            className="w-32"
          />
        </div>

        {/* Payment Reminders */}
        <div className="space-y-3 pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium text-gray-900">Payment Reminders</Label>
              <p className="text-sm text-gray-600">Send payment reminders before due date</p>
            </div>
            <Switch
              checked={formData.paymentReminders}
              onCheckedChange={() => handleToggle('paymentReminders')}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-primary hover:bg-indigo-700 text-white px-8 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

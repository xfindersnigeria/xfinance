'use client';

import React from 'react';
import { Check, X, Trash2, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDeleteSubscriptionTier } from '@/lib/api/hooks/useSubscription';
import { CustomModal } from '@/components/local/custom/modal';
import { useModal } from '@/components/providers/ModalProvider';
import { MODAL } from '@/lib/data/modal-data';
import { MODULES } from '@/lib/types/enums';
import { Separator } from '@/components/ui/separator';
import ConfirmationForm from '@/components/local/shared/ConfirmationForm';
import { CreatePlanForm } from './CreatePlanForm';

interface SubscriptionModule {
  id: string;
  subscriptionTierId: string;
  moduleId: string;
  module: {
    id: string;
    moduleKey: string;
    displayName: string;
  };
}

interface PlanCardProps {
  id: string;
  name: string;
  description?: string;
  maxUsers: number;
  maxEntities: number;
  // maxTransactionsMonth: number;
  // maxStorageGB: number;
  // maxApiRatePerHour: number;
  // apiAccess: boolean;
  // webhooks: boolean;
  // sso: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  customBranding: boolean;
  prioritySupport: boolean;
  subscriptionModules?: SubscriptionModule[];
}

export function PlanCard({
  id,
  name,
  description,
  maxUsers,
  maxEntities,
  // maxTransactionsMonth,
  // maxStorageGB,
  // maxApiRatePerHour,
  // apiAccess,
  // webhooks,
  // sso,
  monthlyPrice,
  yearlyPrice,
  customBranding,
  prioritySupport,
  subscriptionModules = [],
}: PlanCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const deleteMutation = useDeleteSubscriptionTier();

  const editKey = MODAL.SUBSCRIPTION_PLAN_EDIT + '-' + id;
  const deleteKey = MODAL.SUBSCRIPTION_PLAN_DELETE + '-' + id;

  const handleEditClick = () => {
    openModal(editKey);
  };

  const handleDeleteClick = () => {
    openModal(deleteKey);
  };

  const handleConfirmDelete = (confirmed: boolean) => {
    if (confirmed) {
      deleteMutation.mutate(id);
    }
    closeModal(deleteKey);
  };

  const features = [
    // { name: 'API Access', enabled: apiAccess },
    // { name: 'Webhooks', enabled: webhooks },
    // { name: 'SSO', enabled: sso },
    { name: 'Custom Branding', enabled: customBranding },
    { name: 'Priority Support', enabled: prioritySupport },
  ];

  return (
    <>
      <Card className="border-2 p-4 flex flex-col border-gray-200 bg-white hover:border-indigo-300 transition-colors">
        <div className="space-y-4 flex-1">
          {/* Header */}
          <div className="space-y-1 line-clamp-3">
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
              {/* <div className="bg-purple-50 p-2 rounded">
                <p className="text-gray-600">Storage</p>
                <p className="font-bold text-gray-900">{maxStorageGB}GB</p>
              </div>
              <div className="bg-orange-50 p-2 rounded">
                <p className="text-gray-600">Transactions</p>
                <p className="font-bold text-gray-900">{maxTransactionsMonth}/mo</p>
              </div> */}
            </div>
            {/* <div className="bg-indigo-50 p-2 rounded text-xs">
              <p className="text-gray-600">API Rate</p>
              <p className="font-bold text-gray-900">{maxApiRatePerHour}/hour</p>
            </div> */}
          </div>

          <Separator />

          {/* Platform Features */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Features</p>
            <div className="space-y-1">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {feature.enabled ? (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                  <span className={feature.enabled ? 'text-gray-900' : 'text-gray-400'}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Modules */}
          {subscriptionModules && subscriptionModules.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">
                  Modules ({subscriptionModules.length})
                </p>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {subscriptionModules.slice(0, 5).map((sm) => (
                    <Badge
                      key={sm.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {sm.module.displayName}
                    </Badge>
                  ))}
                  {subscriptionModules.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{subscriptionModules.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleEditClick}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDeleteClick}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </Card>

      {/* Edit Modal */}
      <CustomModal
        title={`Edit Plan: ${name}`}
        open={isOpen(editKey)}
        onOpenChange={(open) =>
          open ? openModal(editKey) : closeModal(editKey)
        }
        module={MODULES.SUBSCRIPTION}
      >
        <CreatePlanForm
          tier={{
            id,
            name,
            description,
            maxUsers,
            maxEntities,
            monthlyPrice,
            yearlyPrice,
            customBranding,
            prioritySupport,
            subscriptionModules,
          }}
          isEditMode
          onSuccess={() => closeModal(editKey)}
        />
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal
        title="Confirm Deletion"
        open={isOpen(deleteKey)}
        onOpenChange={(open) =>
          open ? openModal(deleteKey) : closeModal(deleteKey)
        }
        module={MODULES.SUBSCRIPTION}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete the "${name}" plan?`}
          onResult={handleConfirmDelete}
          loading={deleteMutation.isPending}
        />
      </CustomModal>
    </>
  );
}

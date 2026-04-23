'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SubscriptionExpiredModalProps {
  open: boolean;
  expiredTier: string;
  expiredDate: string;
  onExpired?: () => void;
}

export function SubscriptionExpiredModal({
  open,
  expiredTier,
  expiredDate,
  onExpired,
}: SubscriptionExpiredModalProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          clearInterval(interval);
          // Trigger logout
          if (onExpired) {
            onExpired();
          }
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onExpired]);

  const handleLogoutNow = () => {
    if (onExpired) {
      onExpired();
    }
  };

  const formattedDate = new Date(expiredDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Subscription Expired
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="text-gray-700 mb-2">
              Your <span className="font-semibold">{expiredTier}</span> subscription has expired.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Expiry Date: <span className="font-medium">{formattedDate}</span>
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-900 font-semibold mb-1">
                Logging out in:
              </p>
              <p className="text-4xl font-bold text-red-600">{countdown}</p>
              <p className="text-sm text-red-700 mt-2">seconds</p>
            </div>

            <p className="text-sm text-gray-600">
              You will be automatically logged out. Please contact support to renew your subscription.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleLogoutNow}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Log Out Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/session';
import { useWhoami } from '@/lib/api/hooks/useAuth';
import { useRealtimeSync } from '@/lib/hooks/useRealtimeSync';
import { SubscriptionExpiredModal } from '@/components/local/custom/subscription-expired-modal';
import { WhoamiResponse } from '@/lib/types';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

interface SessionProviderProps {
  children: React.ReactNode;
  initialWhoami?: WhoamiResponse;
}

/**
 * SessionProvider - Only wraps protected dashboard routes
 * Fetches complete user context (whoami) server-side via DashboardLayout
 * and uses it as initial data to prevent double API calls
 * 
 * Note: proxy.ts is the single source of truth for route access control
 */
export default function SessionProvider({
  children,
  initialWhoami,
}: SessionProviderProps) {
  const router = useRouter();
  const setWhoami = useSessionStore((state) => state.setWhoami);
  const clearSession = useSessionStore((state) => state.clearSession);
  const shouldFetchClientSide = !initialWhoami;
  const { data: whoami, isLoading, error } = useWhoami({
    enabled: shouldFetchClientSide,
  });

  // Initialize WebSocket for realtime updates (only when user is authenticated)
  const { isConnected, subscriptionExpired, onSubscriptionExpiredLogout } = useRealtimeSync();

  // Prefer fresh server-provided whoami when available.
  useEffect(() => {
    if (initialWhoami) {
      setWhoami(initialWhoami);
      return;
    }

    if (whoami) {
      setWhoami(whoami);
    }
  }, [initialWhoami, whoami, setWhoami]);

  // Handle authentication errors - redirect to login
  useEffect(() => {
    if (error) {
      clearSession();
      router.push('/auth/login');
    }
  }, [error, clearSession, router]);

  // Show loading spinner while fetching whoami (only if no initial data)
  if (isLoading && shouldFetchClientSide) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Don't render if there was an error (redirect will happen)
  if (error) {
    return null;
  }

  return (
    <ThemeProvider>
      <SubscriptionExpiredModal
        open={subscriptionExpired.isOpen}
        expiredTier={subscriptionExpired.expiredTier}
        expiredDate={subscriptionExpired.expiredDate}
        onExpired={onSubscriptionExpiredLogout}
      />
      {children}
    </ThemeProvider>
  );
}

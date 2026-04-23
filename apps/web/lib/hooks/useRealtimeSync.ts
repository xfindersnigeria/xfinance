'use client';

/**
 * useRealtimeSync Hook
 * 
 * Initializes WebSocket and listens for realtime events
 * Updates session store when events are received
 * 
 * Usage in SessionProvider:
 * const { isConnected } = useRealtimeSync();
 */

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSessionStore } from '@/lib/store/session';
import { getWhoami, logout } from '@/lib/api/services/authService';
import {
  initializeWebSocket,
  disconnectWebSocket,
  onWebSocketConnectionChange,
} from '@/lib/api/websocket';
import { RealtimeEventType } from '@/lib/types/realtimeEvents';

interface UseRealtimeSyncOptions {
  enabled?: boolean; // Set to false to disable (e.g., during logout)
  onSubscriptionExpired?: (modal: React.ReactNode) => void; // Callback to render modal
}

interface SubscriptionExpiredState {
  isOpen: boolean;
  expiredTier: string;
  expiredDate: string;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState<SubscriptionExpiredState>({
    isOpen: false,
    expiredTier: '',
    expiredDate: '',
  });

  // Get actions from session store
  const whoami = useSessionStore((state) => state.whoami);
  const setWhoami = useSessionStore((state) => state.setWhoami);
  const user = useSessionStore((state) => state.user);


  // Initialize WebSocket on mount
  useEffect(() => {
    if (!enabled || !user?.id || !whoami?.context?.groupId) {
      return;
    }

    try {
      // WebSocket uses cookie-based auth (withCredentials: true)
      // Cookies are automatically sent by socket.io client
      initializeWebSocket({
        userId: user.id,
        groupId: whoami.context.groupId,
      });

      // Listen to connection state changes
      const unsubscribe = onWebSocketConnectionChange((connected) => {
        setIsConnected(connected);
        setConnectionError(null);
      });

      return unsubscribe;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize WebSocket';
      setConnectionError(message);
    }

    return () => {
      disconnectWebSocket();
    };
  }, [enabled, user?.id, whoami?.context?.groupId]);

  // Handle real-time events: refetch whoami data when backend sends invalidation
  const handleRealtimeEvent = useCallback(
    (event: Event) => {
      const { type, payload } = (event as CustomEvent<{ type: RealtimeEventType; payload: any }>).detail;

      if (type === 'whoami-invalidated') {
        // Event payload has 'reason' explaining what changed
        queryClient.invalidateQueries({ queryKey: ['whoami'] });
        queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
        queryClient.invalidateQueries({ queryKey: ['superadmin', 'dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['groups', 'stats'] });
        getWhoami().then(setWhoami).catch((error) => {
          console.error('Error fetching whoami:', error);
        });
      } else if (type === 'entity-removed') {
        // Special case: redirect if currently viewing deleted entity
        queryClient.invalidateQueries({ queryKey: ['entity', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['entity', 'detail'] });
        if (whoami?.context?.currentEntity?.id === payload.entityId) {
          window.location.href = '/dashboard';
        } else {
          getWhoami().then(setWhoami).catch((error) => {
            console.error('Error fetching whoami:', error);
          });
        }
      
      } else if (type === 'subscription-expired') {
        // Subscription expired - show modal with countdown
        queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
        setSubscriptionExpired({
          isOpen: true,
          expiredTier: payload.expiredTier || 'Premium',
          expiredDate: payload.expiredDate || new Date().toISOString(),
        });
      } else if (type === 'subscription-changed') {
        // Subscription updated - invalidate all subscription-related caches
        queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
        queryClient.invalidateQueries({ queryKey: ['subscription', 'tiers'] });
        queryClient.invalidateQueries({ queryKey: ['subscription', 'settings'] });
        queryClient.invalidateQueries({ queryKey: ['whoami'] });
        // Also invalidate dashboard and analytics caches since subscription affects them
        queryClient.invalidateQueries({ queryKey: ['superadmin', 'dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['groups', 'stats'] });
        toast.info('Your subscription has been updated', {
          description: 'Refreshing subscription details...',
        });
        getWhoami().then(setWhoami).catch((error) => {
          console.error('Error fetching whoami after subscription change:', error);
        });
      } else if (type === 'entity-added' || type === 'entity-updated') {
        // Entity was added or updated - refetch list and detail
        queryClient.invalidateQueries({ queryKey: ['entity', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['entity', 'detail'] });
        getWhoami().then(setWhoami).catch((error) => {
          console.error('Error fetching whoami after entity change:', error);
        });
      } else if (type === 'permissions-changed' || type === 'menus-invalidated') {
        // Permissions or menus changed - refetch whoami
        queryClient.invalidateQueries({ queryKey: ['whoami'] });
        getWhoami().then(setWhoami).catch((error) => {
          console.error('Error fetching whoami after permissions change:', error);
        });
      } else if (type === 'customization-changed') {
        // Use getState() to bypass stale closure — always spread the live whoami
        if (payload?.customization) {
          const liveWhoami = useSessionStore.getState().whoami;
          if (liveWhoami) {
            setWhoami({ ...liveWhoami, customization: payload.customization });
          }
        }
      } else if (type === 'role-changed'){
queryClient.invalidateQueries({ queryKey: ['whoami'] });
 queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
getWhoami().then(setWhoami).catch((error) => {
          console.error('Error fetching whoami after role change:', error);
        });
      }
       else if (type === 'user-role-changed') {
        // Only handle if the current user's id matches the affected user
        if (user?.id && payload?.userId && user.id === payload.userId) {
          const newRoleName = payload.newRoleName || 'Unknown Role';
          queryClient.invalidateQueries({ queryKey: ['whoami'] });
          queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
          queryClient.invalidateQueries({ queryKey: ['subscription', 'tiers'] });
          queryClient.invalidateQueries({ queryKey: ['superadmin', 'dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['groups', 'stats'] });
          toast.info(`Your role has been updated to "${newRoleName}"`, {
            description: 'Menu and permissions have been refreshed.',
          });
          // Refetch whoami to update menu and permissions
          getWhoami().then(setWhoami).catch((error) => {
            console.error('Error fetching whoami after role change:', error);
          });
      
    
        } } else {
        // For other user role changes, just refetch whoami to update permissions
        queryClient.invalidateQueries({ queryKey: ['whoami'] });
        getWhoami().then(setWhoami).catch((error) => {
          console.error('Error fetching whoami after user role change:', error);
        });
      }
    },
    [queryClient, setWhoami, user?.id, whoami?.context?.currentEntity?.id]
  );

     useEffect(() => {
        window.addEventListener('realtime-event', handleRealtimeEvent as EventListener);
    return () => {
      window.removeEventListener('realtime-event', handleRealtimeEvent as EventListener);
    };
  }, [handleRealtimeEvent]);

  // Handle subscription expired logout
  const handleSubscriptionExpiredLogout = useCallback(() => {
    // Close modal
    setSubscriptionExpired({
      ...subscriptionExpired,
      isOpen: false,
    });

    // Clear session and disconnect WebSocket
    useSessionStore.getState().clearSession();
    disconnectWebSocket();

    // Call logout API
    logout()
      .then(() => {
        // Redirect to login
        window.location.href = '/auth/login';
      })
      .catch((error) => {
        console.error('Error during logout:', error);
        // Still redirect even if logout API fails
        window.location.href = '/auth/login';
      });
  }, [subscriptionExpired]);

  return {
    isConnected,
    connectionError,
    subscriptionExpired,
    onSubscriptionExpiredLogout: handleSubscriptionExpiredLogout,
  };
}

/**
 * Hook to show realtime connection status in UI
 */
export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to connection state changes
    const unsubscribe = onWebSocketConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    connectionError,
  };
}

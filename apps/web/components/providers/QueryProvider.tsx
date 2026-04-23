'use client';

/**
 * Query Provider Component
 * Wraps the application with TanStack Query client provider
 * Optimized with data-type specific caching strategies
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a client for the app with optimized cache strategies
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default: moderate cache for general queries
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: 'stale' as any, // Only refetch if data is stale
    },
    mutations: {
      retry: 1,
    },
  },
});


interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Export queryClient for use in other parts of the app if needed
export { queryClient };

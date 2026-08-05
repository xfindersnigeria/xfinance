'use client';

/**
 * Query Provider Component
 * Wraps the application with TanStack Query client provider
 * Optimized with data-type specific caching strategies
 */

import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a client for the app with optimized cache strategies
const queryClient = new QueryClient({
  // Dashboard data (KPIs, charts, etc.) is derived from receipts, expenses,
  // invoices, journals, bank transactions and more — far too many mutations
  // to remember to invalidate ["dashboard"] individually on each one, and
  // it's easy to add a new one later and forget. Instead, treat it as a
  // cross-cutting concern: after ANY mutation succeeds anywhere in the app,
  // mark dashboard queries stale so the next view refetches instead of
  // serving up to 5 minutes of stale data. Cheap when the dashboard isn't
  // being viewed — invalidation only triggers a refetch for actively
  // mounted/observed queries.
  mutationCache: new MutationCache({
    onSuccess: () => {
      [
        'dashboard',
        'monthlyBreakdown',
        'cashFlow',
        'expensesByCategory',
        'kpis',
        'receivableAging',
        'payableAging',
        'recentTransactions',
        'adminDashboard',
        'superadmin',
      ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  }),
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

// ============================================================================
// React Query Provider
// ============================================================================
// Global query client configuration and provider wrapper.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

// Create a client with sensible defaults
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,      // 5 minutes - data considered fresh
            gcTime: 1000 * 60 * 30,        // 30 minutes - garbage collection time
            retry: 1,                       // Retry failed requests once
            refetchOnWindowFocus: false,   // Don't refetch on tab focus
            refetchOnReconnect: true,      // Refetch on reconnect
        },
        mutations: {
            retry: 0,                       // Don't retry mutations
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
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}

// Export queryClient for manual cache operations
export { queryClient };

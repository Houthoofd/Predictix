import { httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import { trpc } from './trpc';
import { getAuthToken } from './authContext';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/trpc',
      headers() {
        const token = getAuthToken();
        return token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {};
      },
    }),
  ],
});

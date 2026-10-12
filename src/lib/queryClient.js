import { QueryClient } from '@tanstack/react-query';

export const CACHE_KEY = 'hm-cache-v1';

// 502, 503 and 504 are what a hosting proxy answers while a sleeping server starts up.
const STARTING_UP = [502, 503, 504];

// - staleTime: data fetched in the last 30 seconds is reused when moving between pages, no new request.
// - retry: a dropped connection or a server that is still starting is retried quietly, up to 3 times.
//   A real answer such as 404 or 400 is never retried.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: (count, error) => count < 3 && (!error?.response || STARTING_UP.includes(error.response.status)),
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
  },
});

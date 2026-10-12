import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CACHE_KEY, queryClient } from '../lib/queryClient';

export const useAuth = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => {
        // Drop cached data so the next landlord on this browser never sees it.
        queryClient.clear();
        try {
          sessionStorage.removeItem(CACHE_KEY);
        } catch {
          /* ignore */
        }
        set({ token: null, user: null });
      },
    }),
    { name: 'auth' }
  )
);

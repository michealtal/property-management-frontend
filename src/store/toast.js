import { create } from 'zustand';
import { MAX_WORDS, MIN_WORDS, countWords } from '../lib/messages';

let nextId = 1;

export const useToasts = create((set, get) => ({
  toasts: [],

  push: (kind, message) => {
    if (import.meta.env.DEV) {
      const words = countWords(message);
      if (words < MIN_WORDS || words > MAX_WORDS) {
        console.warn(`Toast should be ${MIN_WORDS} to ${MAX_WORDS} words: "${message}"`);
      }
    }
    // The same message twice in a row would only stack up. Show it once.
    const same = get().toasts.find((t) => t.kind === kind && t.message === message);
    if (same) return same.id;

    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, kind, message }] }));
    return id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Use anywhere, inside or outside React: toast.success(OK.tenantAdded)
export const toast = {
  success: (message) => useToasts.getState().push('success', message),
  error: (message) => useToasts.getState().push('error', message),
  info: (message) => useToasts.getState().push('info', message),
};

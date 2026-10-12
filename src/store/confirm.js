import { create } from 'zustand';

export const useConfirmStore = create((set, get) => ({
  request: null,
  ask: (options) => new Promise((resolve) => set({ request: { ...options, resolve } })),
  answer: (value) => {
    get().request?.resolve(value);
    set({ request: null });
  },
}));

// const yes = await confirm({ title, message, confirmLabel, danger: true })
export const confirm = (options) => useConfirmStore.getState().ask(options);

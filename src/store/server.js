import { create } from 'zustand';

// 'ok'     everything is answering
// 'waking' the server was asleep and is starting up
// 'slow'   the server is awake but a request is taking a long time
export const useServer = create((set) => ({
  status: 'ok',
  set: (status) => set({ status }),
}));

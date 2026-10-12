import { useServer } from '../store/server';

const TEN_MINUTES = 10 * 60 * 1000;
let lastAnswer = 0;
let inFlight = false;

// Wakes a sleeping server (Render's free plan sleeps after about 15 minutes) while the landlord is
// still typing their password, so the first real request does not have to wait for the start-up.
// Any answer counts, even "401 not logged in": it proves the server is awake.
export function warmUp() {
  if (inFlight || Date.now() - lastAnswer < TEN_MINUTES) return;
  inFlight = true;
  // Only say "waking up" if the server has not answered within a moment.
  const timer = setTimeout(() => useServer.getState().set('waking'), 2500);
  fetch(`${import.meta.env.VITE_API_URL}/apartments`, { cache: 'no-store' })
    .catch(() => {})
    .finally(() => {
      clearTimeout(timer);
      inFlight = false;
      lastAnswer = Date.now();
      if (useServer.getState().status === 'waking') useServer.getState().set('ok');
    });
}

// Wake it again when the landlord comes back to the tab after a while.
export function warmUpOnReturn() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') warmUp();
  });
}

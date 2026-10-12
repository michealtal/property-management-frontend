import { useAuth } from '../store/auth';
import { get } from './format';
import { docUrl } from './tenant';
import { CACHE_KEY, queryClient } from './queryClient';

// Apartments and tenants are saved in this browser, so the next visit shows them at once
// while fresh data loads in the background. Even if the server needs a minute to wake, the
// landlord is already looking at their data.
//
// Privacy: tenants are saved in a slim form (name, phone, email, apartment, file links). ID numbers,
// employment, references and other private details are never stored here. Logging out erases it all.
const MAX_AGE = 24 * 60 * 60 * 1000;
const LISTS = ['apartments', 'tenants'];

export const slimTenant = (t) => ({
  id: t.id,
  _id: t._id,
  apartment: t.apartment && typeof t.apartment === 'object' ? { _id: t.apartment._id ?? t.apartment.id } : t.apartment,
  personalInformation: {
    fullName: get(t, 'personalInformation.fullName'),
    phoneNumbers: get(t, 'personalInformation.phoneNumbers'),
    email: get(t, 'personalInformation.email'),
  },
  passportPhoto: docUrl(t, 'passportPhoto'),
  idDocument: docUrl(t, 'idDocument'),
  workId: docUrl(t, 'workId'),
});

function snapshot() {
  const { token, user } = useAuth.getState();
  if (!token || !user?.id) return null;
  const entry = (name, shrink) => {
    const data = queryClient.getQueryData([name]);
    if (!Array.isArray(data)) return null;
    return { data: shrink ? data.map(shrink) : data, at: queryClient.getQueryState([name])?.dataUpdatedAt || Date.now() };
  };
  return { userId: user.id, apartments: entry('apartments'), tenants: entry('tenants', slimTenant) };
}

let timer = null;
const scheduleSave = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      const data = snapshot();
      if (data) sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: the app simply works without the saved copy */
    }
  }, 800);
};

// Save whenever one of the lists loads.
export function startPersisting() {
  queryClient.getQueryCache().subscribe((event) => {
    const key = event.query?.queryKey;
    if (event.type === 'updated' && event.action?.type === 'success' && key?.length === 1 && LISTS.includes(key[0])) {
      scheduleSave();
    }
  });
}

// Load the saved lists before the first screen is drawn. Only for the same landlord, and not older than a day.
// `updatedAt` keeps them marked as old, so a fresh copy is still fetched straight away.
export function restoreCache() {
  try {
    localStorage.removeItem(CACHE_KEY); // older versions kept this copy in permanent storage
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const { token, user } = useAuth.getState();
    if (!token || !user?.id || saved.userId !== user.id) return;
    LISTS.forEach((name) => {
      const entry = saved[name];
      if (entry && Array.isArray(entry.data) && Date.now() - entry.at < MAX_AGE) {
        queryClient.setQueryData([name], entry.data, { updatedAt: entry.at });
      }
    });
  } catch {
    /* damaged copy: ignore it */
  }
}

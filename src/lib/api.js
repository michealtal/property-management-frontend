import axios from 'axios';
import { useAuth } from '../store/auth';
import { useServer } from '../store/server';
import { toast } from '../store/toast';
import { ERR } from './messages';

// 60 seconds: a sleeping free server can take almost a minute to answer its first request.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000,
});

// Track how long requests are taking. If something is still waiting after 8 seconds,
// a small banner says so. It disappears when everything has answered.
let pending = 0;
let slowTimer = null;

function started() {
  pending += 1;
  if (slowTimer) return;
  slowTimer = setTimeout(() => {
    slowTimer = null;
    if (pending > 0 && useServer.getState().status === 'ok') useServer.getState().set('slow');
  }, 8000);
}

function finished() {
  pending = Math.max(0, pending - 1);
  if (pending > 0) return;
  clearTimeout(slowTimer);
  slowTimer = null;
  if (useServer.getState().status !== 'ok') useServer.getState().set('ok'); // an answer means the server is awake
}

// Send the JWT with every request. The landlord ID is never sent; the backend reads it from the token.
// A request may carry its own Authorization header (used while registering, before login is stored).
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  // Uploads are slow because of their size, not because the server is slow. They are not counted.
  if (!(config.data instanceof FormData)) {
    config.counted = true;
    started();
  }
  return config;
});

// An expired or invalid token logs the landlord out, and says so.
// A wrong password on the login screen is also a 401, but there is no token yet.
api.interceptors.response.use(
  (response) => {
    if (response.config.counted) finished();
    return response;
  },
  (error) => {
    if (error.config?.counted) finished();
    // Keep the server's exact answer in the console, so any failure can be diagnosed.
    if (import.meta.env.DEV && error.response) {
      console.error(`[API ${error.response.status}] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response.data);
    }
    if (error.response?.status === 401 && useAuth.getState().token) {
      useAuth.getState().logout();
      toast.error(ERR.sessionExpired);
    }
    return Promise.reject(error);
  }
);

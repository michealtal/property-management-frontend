import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { restoreCache, startPersisting } from './lib/persistCache';
import { queryClient } from './lib/queryClient';
import { warmUp, warmUpOnReturn } from './lib/warmup';
import './index.css';

// Earlier versions of this app registered a service worker for a dummy backend. It no longer exists,
// so remove it if this browser still has one.
navigator.serviceWorker?.getRegistrations().then((list) => list.forEach((r) => r.unregister()));

// Start the speed-ups before the first screen: show last visit's data, and wake the server now.
restoreCache();
startPersisting();
warmUp();
warmUpOnReturn();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);

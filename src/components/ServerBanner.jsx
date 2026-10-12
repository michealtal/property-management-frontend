import { useServer } from '../store/server';
import { NOTE } from '../lib/messages';
import { Spinner } from './ui';

// A small pill at the bottom while the server wakes up or answers slowly. It goes away by itself.
export default function ServerBanner() {
  const status = useServer((s) => s.status);
  if (status === 'ok') return null;
  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-float md:bottom-6"
    >
      <Spinner className="h-4 w-4 text-glow-400" />
      {status === 'waking' ? NOTE.waking : NOTE.slow}
    </div>
  );
}

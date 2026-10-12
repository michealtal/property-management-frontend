import { useEffect, useRef } from 'react';
import { useToasts } from '../store/toast';
import Icon from './Icon';

const LOOK = {
  success: { icon: 'check-circle', tone: 'text-emerald-400', bar: 'bg-emerald-400', ms: 4000 },
  error: { icon: 'alert-circle', tone: 'text-red-400', bar: 'bg-red-400', ms: 7000 },
  info: { icon: 'info', tone: 'text-glow-400', bar: 'bg-glow-400', ms: 4500 },
};

function ToastItem({ toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  const look = LOOK[toast.kind];
  const left = useRef(look.ms);
  const startedAt = useRef(0);
  const timer = useRef(null);

  const run = () => {
    startedAt.current = Date.now();
    timer.current = setTimeout(() => dismiss(toast.id), left.current);
  };
  const pause = () => {
    clearTimeout(timer.current);
    left.current -= Date.now() - startedAt.current;
  };

  useEffect(() => {
    run();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={run}
      className="group pointer-events-auto relative w-full max-w-sm animate-toast-in overflow-hidden rounded-xl bg-ink-900 text-white shadow-float"
    >
      <div className="flex items-center gap-3 p-4">
        <Icon name={look.icon} className={`h-6 w-6 shrink-0 ${look.tone}`} />
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss message"
          className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      <div
        className={`absolute bottom-0 left-0 h-0.5 w-full origin-left ${look.bar} group-hover:[animation-play-state:paused]`}
        style={{ animation: `toast-bar ${look.ms}ms linear forwards` }}
      />
    </div>
  );
}

export default function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

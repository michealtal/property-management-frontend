import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

// ---------- class strings (for <Link> and plain elements) ----------
export const inp =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 ' +
  'aria-invalid:border-bad-600 aria-invalid:ring-bad-50 ' +
  'file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-60';
export const btn = `${base} bg-brand-600 text-white hover:bg-brand-700`;
export const btn2 = `${base} border border-line bg-white text-slate-800 hover:bg-slate-50`;
export const btnDanger = `${base} bg-bad-600 text-white hover:bg-bad-700`;
export const btnDangerLine = `${base} border border-bad-600/30 bg-white text-bad-700 hover:bg-bad-50`;

const VARIANTS = { primary: btn, secondary: btn2, danger: btnDanger, dangerLine: btnDangerLine };

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// A button that shows a spinner while `loading`, and cannot be pressed twice.
export function Button({ variant = 'primary', loading = false, icon, children, disabled, className = '', ...props }) {
  return (
    <button className={`${VARIANTS[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <Spinner /> : icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </button>
  );
}

// ---------- layout pieces ----------
export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-line bg-white ${className}`}>{children}</div>;
}

const BADGES = {
  Occupied: ['bg-glow-400/25 text-amber-900', 'bg-glow-500'],
  Active: ['bg-ok-50 text-ok-700', 'bg-ok-600'],
  Vacant: ['bg-slate-100 text-slate-600', 'bg-slate-400'],
};

export function Badge({ v }) {
  const [look, dot] = BADGES[v] || BADGES.Vacant;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${look}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {v}
    </span>
  );
}

export function PageHeader({ title, subtitle, back, children }) {
  useEffect(() => {
    document.title = `${title} – House Management`;
  }, [title]);

  return (
    <header className="mb-6">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <Icon name="arrow-left" className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </header>
  );
}

// ---------- feedback ----------
const NOTICES = {
  error: ['bg-bad-50 text-bad-700', 'alert-circle'],
  ok: ['bg-ok-50 text-ok-700', 'check-circle'],
  info: ['bg-brand-50 text-brand-800', 'info'],
};

export function Notice({ kind = 'error', children }) {
  const [look, icon] = NOTICES[kind];
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${look}`}>
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// Shown in place of a page that could not load. `back` gives a way out when retrying is pointless.
export function ErrorBox({ message, onRetry, back }) {
  return (
    <Card className="max-w-xl p-5">
      <Notice>{message}</Notice>
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <button className={btn} onClick={onRetry}>
            Try again
          </button>
        )}
        {back && (
          <Link className={btn2} to={back.to}>
            {back.label}
          </Link>
        )}
      </div>
    </Card>
  );
}

export function EmptyState({ icon = 'building', title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-ink-900 text-glow-400">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------- loading ----------
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// The red message under a form field.
export function FieldError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-bad-700">
      <Icon name="alert-circle" className="h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

export const labelText = 'mb-1.5 block text-sm font-semibold text-slate-700';

// What the server actually answered. Shown only while developing (npm run dev), never in a production build.
export function DevDetail({ text }) {
  if (!import.meta.env.DEV || !text) return null;
  return (
    <details className="mt-2 rounded-lg bg-slate-900 p-3 text-xs text-slate-200">
      <summary className="cursor-pointer font-semibold text-glow-400">Server response (development only)</summary>
      <pre className="mt-2 whitespace-pre-wrap break-words">{text}</pre>
    </details>
  );
}

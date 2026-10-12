// The mark: a tiny block with one lit window.
export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#182742" />
      <rect x="9" y="8" width="18" height="21" rx="2" fill="#33476d" />
      <rect x="12" y="11" width="4.5" height="5" rx="1" fill="#f7cf66" />
      <rect x="19.5" y="11" width="4.5" height="5" rx="1" fill="#233556" />
      <rect x="12" y="18.5" width="4.5" height="5" rx="1" fill="#233556" />
      <rect x="19.5" y="18.5" width="4.5" height="5" rx="1" fill="#233556" />
      <rect x="15.5" y="25" width="5" height="4" rx="1" fill="#0b1424" />
    </svg>
  );
}

export default function Logo({ light = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-lg font-bold ${light ? 'text-white' : 'text-ink-900'}`}>
        House Management
      </span>
    </span>
  );
}

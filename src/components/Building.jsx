import { Link } from 'react-router-dom';

const columnsFor = (count) => (count <= 4 ? Math.max(count, 1) : count <= 9 ? 3 : count <= 16 ? 4 : 5);

function Window({ unit, index, decorative }) {
  const lit = unit.occupied;
  const look = lit
    ? 'bg-glow-400 text-ink-900 shadow-[0_0_18px_2px_rgba(247,207,102,0.35)] animate-window-on'
    : 'border border-dashed border-ink-600 bg-ink-700 text-slate-400';
  const className = `relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[3px] px-1 text-center font-display text-sm font-semibold ${look}`;
  const style = lit ? { animationDelay: `${index * 90}ms` } : undefined;
  const mullion = lit && <span className="absolute inset-y-0 left-1/2 w-px bg-ink-900/15" />;
  const label = <span className="relative truncate">{unit.label}</span>;

  if (decorative) {
    return (
      <div className={className} style={style}>
        {mullion}
      </div>
    );
  }
  return (
    <Link
      to={unit.to}
      className={`${className} transition-transform hover:scale-[1.04]`}
      style={style}
      title={lit ? `${unit.label}, ${unit.tenant || 'occupied'}` : `${unit.label}, vacant`}
      aria-label={lit ? `Apartment ${unit.label}, occupied by ${unit.tenant || 'a tenant'}` : `Apartment ${unit.label}, vacant`}
    >
      {mullion}
      {label}
    </Link>
  );
}

// An apartment block seen from the street. Every apartment is a window: lit when occupied, dark when vacant.
// `units` is [{ id, label, occupied, tenant, to }]. With `decorative`, windows are plain shapes, not links.
export default function Building({ units, decorative = false, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-sm ${className}`} aria-hidden={decorative || undefined}>
      <div className="h-2.5 rounded-t-md bg-ink-600" />
      <div
        className="grid gap-2 bg-ink-800 p-3"
        style={{ gridTemplateColumns: `repeat(${columnsFor(units.length)}, minmax(0, 1fr))` }}
      >
        {units.map((unit, i) => (
          <Window key={unit.id} unit={unit} index={i} decorative={decorative} />
        ))}
      </div>
      <div className="flex justify-center bg-ink-800">
        <div className="h-8 w-9 rounded-t-md border border-b-0 border-ink-600 bg-ink-950" />
      </div>
      <div className="h-2 rounded-b-md bg-ink-600" />
    </div>
  );
}

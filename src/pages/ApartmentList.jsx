import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apartmentsApi } from '../api/apartments';
import { tenantsApi } from '../api/tenants';
import { errMsg, plural } from '../lib/format';
import { FAIL } from '../lib/messages';
import { withOccupancy } from '../lib/tenant';
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Skeleton, btn } from '../components/ui';
import Icon from '../components/Icon';

function Tile({ a }) {
  const occupied = a.status === 'Occupied';
  return (
    <Link
      to={`/apartments/${a.id}`}
      className="flex gap-4 rounded-xl border border-line bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      {/* The same window as on the dashboard: lit when occupied, dark when vacant. */}
      <span
        className={`h-16 w-12 shrink-0 rounded-[3px] ${
          occupied ? 'bg-glow-400 shadow-[0_0_14px_1px_rgba(247,207,102,0.5)]' : 'border border-dashed border-ink-600 bg-ink-700'
        }`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate font-display text-lg font-bold text-ink-900">{a.apartmentNumber}</span>
          <Badge v={a.status} />
        </span>
        <span className="block text-sm text-slate-600">{a.type}</span>
        <span className="block truncate text-sm text-slate-500">{a.address}</span>
        <span className="mt-1 block truncate text-sm font-medium text-slate-800">{a.tenant || 'No tenant yet'}</span>
      </span>
    </Link>
  );
}

export default function ApartmentList() {
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apartmentsApi.list });
  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.list });
  const q = {
    isLoading: apartments.isLoading || tenants.isLoading,
    error: apartments.error || tenants.error,
    refetch: () => {
      apartments.refetch();
      tenants.refetch();
    },
    data: apartments.data && tenants.data ? withOccupancy(apartments.data, tenants.data) : undefined,
  };
  const rows = q.data || [];

  return (
    <>
      <PageHeader title="Apartments" subtitle={q.data ? plural(rows.length, 'apartment') : undefined}>
        <Link className={btn} to="/apartments/new">
          <Icon name="plus" className="h-4 w-4" />
          Add apartment
        </Link>
      </PageHeader>

      {q.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}
      {q.error && <ErrorBox message={errMsg(q.error, FAIL.apartmentsLoad)} onRetry={q.refetch} />}

      {q.data &&
        (rows.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => <Tile key={a.id} a={a} />)}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon="building"
              title="No apartments yet"
              text="Add your first apartment, then assign a tenant to it."
              action={<Link className={btn} to="/apartments/new">Add apartment</Link>}
            />
          </Card>
        ))}
    </>
  );
}

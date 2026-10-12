import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apartmentsApi } from '../api/apartments';
import { tenantsApi } from '../api/tenants';
import { useAuth } from '../store/auth';
import { errMsg, greeting, longToday, plural } from '../lib/format';
import { FAIL } from '../lib/messages';
import { apartmentIdOf, docsTracked, missingDocs, tenantName, tenantPhoto, withOccupancy } from '../lib/tenant';
import Avatar from '../components/Avatar';
import Building from '../components/Building';
import Icon from '../components/Icon';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton, btn, btn2 } from '../components/ui';

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-9 w-72" />
      <Skeleton className="mb-6 h-4 w-40" />
      <Skeleton className="mb-6 h-72" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apartmentsApi.list });
  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.list });

  const title = `${greeting()}${user?.firstName ? `, ${user.firstName}` : ''}`;

  if (apartments.isLoading || tenants.isLoading) return <DashboardSkeleton />;
  const failed = apartments.error || tenants.error;
  if (failed) {
    return (
      <>
        <PageHeader title={title} />
        <ErrorBox
          message={errMsg(failed, FAIL.dashboard)}
          onRetry={() => {
            apartments.refetch();
            tenants.refetch();
          }}
        />
      </>
    );
  }

  const T = tenants.data || [];
  const A = withOccupancy(apartments.data || [], T);
  const occupied = A.filter((a) => a.status === 'Occupied').length;
  const vacant = A.length - occupied;
  const incomplete = docsTracked(T) ? T.filter(missingDocs) : [];
  const numberOf = (t) => A.find((a) => a.id === apartmentIdOf(t))?.apartmentNumber;
  const units = A.map((a) => ({
    id: a.id,
    label: a.apartmentNumber,
    occupied: a.status === 'Occupied',
    tenant: a.tenant,
    to: `/apartments/${a.id}`,
  }));

  return (
    <>
      <PageHeader title={title} subtitle={longToday()}>
        <Link className={btn} to="/tenants/new">
          <Icon name="plus" className="h-4 w-4" />
          Add tenant
        </Link>
        <Link className={btn2} to="/apartments/new">
          Add apartment
        </Link>
      </PageHeader>

      <section className="mb-6 overflow-hidden rounded-xl bg-ink-900">
        {A.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h2 className="text-2xl font-bold text-white">Your building starts here</h2>
            <p className="mx-auto mt-2 max-w-sm text-slate-400">
              Add your first apartment. Each one appears as a window that lights up when a tenant moves in.
            </p>
            <Link to="/apartments/new" className={`${btn} mt-6`}>
              Add apartment
            </Link>
          </div>
        ) : (
          <div className="grid items-center gap-8 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <p className="font-display text-5xl font-bold text-white">
                {occupied}
                <span className="text-slate-500"> of {A.length}</span>
              </p>
              <p className="mt-1 text-lg text-slate-300">{A.length === 1 ? 'home is occupied' : 'homes are occupied'}</p>
              <p className="mt-4 max-w-xs text-sm text-slate-400">
                {vacant === 0
                  ? 'Every apartment has a tenant. Nothing is sitting empty.'
                  : `${plural(vacant, 'apartment')} ${vacant === 1 ? 'is' : 'are'} vacant and ready for a tenant.`}
              </p>
              <dl className="mt-6 flex gap-5 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[2px] bg-glow-400" />
                  <dt>Occupied</dt>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[2px] border border-dashed border-ink-600 bg-ink-700" />
                  <dt>Vacant</dt>
                </div>
              </dl>
            </div>
            <Building units={units} />
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink-900">Needs attention</h2>
          <div className="mt-3 divide-y divide-line">
            {vacant > 0 && (
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{plural(vacant, 'vacant apartment')}</p>
                  <p className="text-sm text-slate-500">Add a tenant to fill them.</p>
                </div>
                <Link to="/tenants/new" className={btn2}>
                  Add tenant
                </Link>
              </div>
            )}
            {incomplete.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={tenantPhoto(t)} name={tenantName(t)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{tenantName(t)}</p>
                    <p className="text-sm text-slate-500">Documents missing</p>
                  </div>
                </div>
                <Link to={`/tenants/${t.id}/edit`} className={btn2}>
                  Upload
                </Link>
              </div>
            ))}
            {incomplete.length > 4 && (
              <p className="py-3 text-sm text-slate-500">
                And {incomplete.length - 4} more tenants with missing documents.
              </p>
            )}
            {vacant === 0 && incomplete.length === 0 && (
              <p className="flex items-center gap-2 py-3 text-sm font-medium text-ok-700">
                <Icon name="check-circle" className="h-5 w-5" />
                Everything is up to date.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Recent tenants</h2>
            <Link to="/tenants" className="text-sm font-semibold text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          {T.length === 0 ? (
            <EmptyState icon="users" title="No tenants yet" text="Tenants you add will show up here." />
          ) : (
            <div className="mt-3 divide-y divide-line">
              {T.slice(-4).reverse().map((t) => (
                <Link key={t.id} to={`/tenants/${t.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar src={tenantPhoto(t)} name={tenantName(t)} />
                    <span className="truncate text-sm font-semibold text-slate-800">{tenantName(t)}</span>
                  </span>
                  <span className="text-sm text-slate-500">{numberOf(t) ? `Apartment ${numberOf(t)}` : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

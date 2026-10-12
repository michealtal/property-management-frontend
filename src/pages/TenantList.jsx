import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apartmentsApi } from '../api/apartments';
import { tenantsApi } from '../api/tenants';
import { errMsg, plural } from '../lib/format';
import { FAIL } from '../lib/messages';
import { apartmentIdOf, tenantEmail, tenantName, tenantPhone, tenantPhoto } from '../lib/tenant';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton, btn, inp } from '../components/ui';

export default function TenantList() {
  const [search, setSearch] = useState('');
  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.list });
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apartmentsApi.list });

  const numberOf = (id) => (apartments.data || []).find((a) => a.id === id)?.apartmentNumber || '—';
  const term = search.trim().toLowerCase();
  const rows = (tenants.data || []).filter(
    (t) => !term || tenantName(t).toLowerCase().includes(term) || tenantPhone(t).includes(term)
  );

  return (
    <>
      <PageHeader title="Tenants" subtitle={tenants.data ? plural(tenants.data.length, 'tenant') : undefined}>
        <Link className={btn} to="/tenants/new">
          <Icon name="plus" className="h-4 w-4" />
          Add tenant
        </Link>
      </PageHeader>

      {tenants.isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      )}
      {tenants.error && <ErrorBox message={errMsg(tenants.error, FAIL.tenantsLoad)} onRetry={tenants.refetch} />}

      {tenants.data &&
        (tenants.data.length === 0 ? (
          <Card>
            <EmptyState
              icon="users"
              title="No tenants yet"
              text="Add a tenant to start keeping their details and documents here."
              action={<Link className={btn} to="/tenants/new">Add tenant</Link>}
            />
          </Card>
        ) : (
          <>
            <div className="relative mb-4 max-w-sm">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inp} pl-9`}
                placeholder="Search by name or phone"
                aria-label="Search tenants"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    {['Tenant', 'Phone', 'Email', 'Apartment'].map((h) => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className="border-b border-line last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link className="flex items-center gap-3 font-semibold text-slate-900 hover:text-brand-700" to={`/tenants/${t.id}`}>
                          <Avatar src={tenantPhoto(t)} name={tenantName(t)} />
                          {tenantName(t)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{tenantPhone(t) || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{tenantEmail(t) || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{numberOf(apartmentIdOf(t))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No tenants match your search.</p>}
            </Card>
          </>
        ))}
    </>
  );
}

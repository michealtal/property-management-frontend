import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apartmentsApi } from '../api/apartments';
import { tenantsApi } from '../api/tenants';
import { confirm } from '../store/confirm';
import { toast } from '../store/toast';
import { errMsg, fmtDate, get, isNotFound } from '../lib/format';
import { apartmentIdOf, docUrl, tenantEmail, tenantName, tenantPhone, tenantPhoto } from '../lib/tenant';
import { ERR, FAIL, OK } from '../lib/messages';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import TenantDocs from '../components/TenantDocs';
import ReportActions from '../components/ReportActions';
import { tenantReport } from '../lib/report';
import { Button, Card, ErrorBox, PageHeader, PageSkeleton, btn2 } from '../components/ui';
import { STEPS } from './tenantFields';

// The ID number is hidden until the landlord asks to see it, so it is not on screen for anyone looking over their shoulder.
function Hidden({ value }) {
  const [shown, setShown] = useState(false);
  const text = String(value);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono">{shown ? text : `${'•'.repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`}</span>
      <button type="button" onClick={() => setShown((v) => !v)} className="text-sm font-semibold text-brand-700 hover:underline">
        {shown ? 'Hide' : 'Show'}
      </button>
    </span>
  );
}

function Value({ tenant, apartments, name, ty }) {
  const raw = get(tenant, name);
  if (name === 'identification.idNumber' && raw) return <Hidden value={raw} />;
  const type = ty.replace('?', '').split(':')[0];
  if (name === 'apartment') return apartments.find((a) => a.id === apartmentIdOf(tenant))?.apartmentNumber || '—';
  if (typeof raw === 'boolean') return type === 'checkbox' ? (raw ? 'Confirmed' : 'Not confirmed') : raw ? 'Yes' : 'No';
  if (type === 'checkbox') return 'Not confirmed';
  if (type === 'date') return fmtDate(raw && String(raw).slice(0, 10));
  if (type === 'number') return raw === undefined || raw === '' ? '—' : Number(raw).toLocaleString();
  return raw || '—';
}

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const tenant = useQuery({ queryKey: ['tenant', id], queryFn: () => tenantsApi.get(id) });
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apartmentsApi.list });

  const del = useMutation({
    mutationFn: () => tenantsApi.remove(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['tenant', id] });
      qc.invalidateQueries({ queryKey: ['tenants'] });
      qc.invalidateQueries({ queryKey: ['apartments'] });
      qc.invalidateQueries({ queryKey: ['apartment'] });
      toast.success(OK.tenantRemoved);
      navigate('/tenants');
    },
    onError: (e) => toast.error(errMsg(e, FAIL.tenantRemove)),
  });

  if (tenant.error) {
    const gone = isNotFound(tenant.error);
    return (
      <ErrorBox
        message={gone ? ERR.tenantGone : errMsg(tenant.error, FAIL.tenantLoad)}
        onRetry={gone ? undefined : tenant.refetch}
        back={{ to: '/tenants', label: 'Back to tenants' }}
      />
    );
  }
  if (!tenant.data) return <PageSkeleton />;

  const T = tenant.data;
  const flat = (apartments.data || []).find((a) => a.id === apartmentIdOf(T));
  const name = tenantName(T);
  const editTo = `/tenants/${id}/edit`;

  async function onRemove() {
    const yes = await confirm({
      title: 'Remove this tenant?',
      message: `${name} and their documents will be deleted. The apartment becomes vacant.`,
      confirmLabel: 'Remove tenant',
      danger: true,
    });
    if (yes) del.mutate();
  }

  return (
    <>
      <PageHeader title={name} back={{ to: '/tenants', label: 'Back to tenants' }}>
        <ReportActions build={() => tenantReport(T, flat)} />
        <Link className={btn2} to={editTo}>
          <Icon name="pencil" className="h-4 w-4" />
          Edit tenant
        </Link>
        <Button variant="dangerLine" icon="trash" loading={del.isPending} onClick={onRemove}>
          Remove tenant
        </Button>
      </PageHeader>

      <Card className="mb-5 flex flex-wrap items-center gap-5 p-5">
        <Avatar src={tenantPhoto(T)} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold text-ink-900">{name}</p>
          <p className="mt-1 text-sm text-slate-600">
            {flat ? (
              <Link className="font-semibold text-brand-700 hover:underline" to={`/apartments/${flat.id}`}>
                Apartment {flat.apartmentNumber}
              </Link>
            ) : (
              'No apartment'
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
            {tenantPhone(T) && (
              <span className="flex items-center gap-1.5">
                <Icon name="phone" className="h-4 w-4 text-slate-400" />
                {tenantPhone(T)}
              </span>
            )}
            {tenantEmail(T) && (
              <span className="flex items-center gap-1.5">
                <Icon name="mail" className="h-4 w-4 text-slate-400" />
                {tenantEmail(T)}
              </span>
            )}
          </div>
        </div>
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-ink-900">Documents</h2>
      <TenantDocs tenant={T} id={id} />

      <Card className="divide-y divide-line">
        {STEPS.map((step) => {
          const fields = step.f.filter(([, , ty]) => !ty.startsWith('file'));
          if (!fields.length) return null;
          return (
            <section key={step.t} className="grid gap-4 p-6 md:grid-cols-[13rem_1fr]">
              <h3 className="text-base font-semibold text-ink-900">{step.t}</h3>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {fields.map(([name, label, ty]) => (
                  <div key={name} className={/^textarea/.test(ty) ? 'sm:col-span-2' : ''}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-0.5 break-words font-medium text-slate-900">
                      <Value tenant={T} apartments={apartments.data || []} name={name} ty={ty} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </Card>
    </>
  );
}

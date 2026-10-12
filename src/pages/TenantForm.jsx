import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apartmentsApi } from '../api/apartments';
import { tenantsApi } from '../api/tenants';
import { toast } from '../store/toast';
import { errMsg, fieldErrors, isNotFound, serverDetail } from '../lib/format';
import { apartmentIdOf, docUrl, tenantName, withOccupancy } from '../lib/tenant';
import { ERR, FAIL, OK } from '../lib/messages';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { Button, Card, DevDetail, ErrorBox, Notice, PageHeader, PageSkeleton, btn, btn2 } from '../components/ui';
import { DOC_FIELDS, RULES, STEPS, buildDefaults, splitValues } from './tenantFields';

// Loads what the form needs, then hands over to the wizard.
export default function TenantForm() {
  const { id } = useParams();
  // The lists come from the saved copy at once if there is one, and refresh in the background.
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apartmentsApi.list });
  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.list });
  // When editing, a copy loaded in the last 2 minutes (for example from the tenant's page) is reused.
  const tenant = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.get(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const queries = id ? [apartments, tenants, tenant] : [apartments, tenants];
  if (queries.some((q) => q.isLoading)) return <PageSkeleton />;

  if (id && isNotFound(tenant.error)) {
    return <ErrorBox message={ERR.tenantGone} back={{ to: '/tenants', label: 'Back to tenants' }} />;
  }
  const failed = queries.find((q) => q.isError && !q.data);
  if (failed) {
    return (
      <ErrorBox
        message={errMsg(failed.error, FAIL.form)}
        onRetry={() => queries.forEach((q) => q.refetch())}
        back={{ to: '/tenants', label: 'Back to tenants' }}
      />
    );
  }
  // key: opening "Add" after "Edit" must start with an empty form.
  const vacancies = withOccupancy(apartments.data || [], tenants.data || []);
  return <Wizard key={id || 'new'} id={id} initial={tenant.data} apartments={vacancies} />;
}

// Wide fields take the full row; short ones sit two to a row.
const isWide = (ty) => /^(textarea|checkbox|file|radio)/.test(ty);

function Steps({ step, goTo }) {
  return (
    <>
      {/* Desktop: a rail down the side */}
      <ol className="hidden md:block">
        {STEPS.map((s, i) => {
          const done = i < step;
          const here = i === step;
          return (
            <li key={s.t} className="relative pb-6 last:pb-0">
              {i < STEPS.length - 1 && (
                <span className={`absolute left-[15px] top-9 h-[calc(100%-2rem)] w-px ${done ? 'bg-brand-600' : 'bg-line'}`} />
              )}
              <button
                type="button"
                disabled={!done}
                onClick={() => goTo(i)}
                aria-current={here ? 'step' : undefined}
                className="flex items-center gap-3 text-left disabled:cursor-default"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    done ? 'bg-brand-600 text-white' : here ? 'bg-ink-900 text-glow-400' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`text-sm ${here ? 'font-semibold text-ink-900' : done ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                  {s.t}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Mobile: one line and a bar */}
      <div className="md:hidden">
        <p className="mb-2 text-sm font-medium text-slate-600">
          Step {step + 1} of {STEPS.length}: {STEPS[step].t}
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.t} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>
    </>
  );
}

function Wizard({ id, initial, apartments }) {
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const f = useForm({ defaultValues: buildDefaults(initial), mode: 'onTouched' });

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState(null); // null | 'saving' | 'uploading'
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');
  // Set when the details were saved but the files were not. Holds what the retry needs.
  const [partial, setPartial] = useState(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const busy = phase !== null;

  // Only vacant apartments can be chosen, plus the one this tenant already lives in.
  // The apartment picked right now always stays in the list, so it cannot vanish after saving
  // (saving turns it Occupied).
  const selectedApartment = f.watch('apartment');
  const apartmentOptions = apartments
    .filter((a) => a.status === 'Vacant' || a.id === apartmentIdOf(initial) || a.id === selectedApartment)
    .map((a) => ({ v: a.id, l: `${a.apartmentNumber}, ${a.type}` }));

  // Warn before the tab is closed or reloaded with unsaved typing.
  const dirty = f.formState.isDirty;
  useEffect(() => {
    if (!dirty || busy) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);

  // Lists and counts change as soon as the tenant is saved.
  function refreshLists() {
    qc.invalidateQueries({ queryKey: ['tenants'] });
    qc.invalidateQueries({ queryKey: ['apartments'] });
    qc.invalidateQueries({ queryKey: ['apartment'] });
  }

  // Forget the old copy so the detail page loads the saved one instead of flashing the cached one.
  function openTenant(tenantId) {
    qc.removeQueries({ queryKey: ['tenant', tenantId], exact: true });
    navigate(`/tenants/${tenantId}`);
  }

  // Request 2. Called after the details are saved, and again by "Retry upload".
  async function sendDocuments(tenantId, files, isRetry = false) {
    setPhase('uploading');
    setPercent(0);
    try {
      await tenantsApi.uploadDocuments(tenantId, files, setPercent);
      toast.success(isRetry ? OK.docsUploaded : isEdit ? OK.tenantUpdated : OK.tenantAddedDocs);
      openTenant(tenantId);
    } catch (e) {
      const message = errMsg(e, FAIL.documents);
      setPartial({ tenantId, files: e.remaining || files, message });
      setPhase(null);
      toast.error(message);
    }
  }

  // The server named fields that are wrong: mark them and jump to the first one.
  function showServerErrors(e) {
    const fields = fieldErrors(e);
    const names = Object.keys(fields);
    if (!names.length) return false;
    names.forEach((name) => f.setError(name, { type: 'server', message: fields[name] }));
    const first = STEPS.findIndex((s) => s.f.some(([name]) => names.includes(name)));
    if (first >= 0) setStep(first);
    return true;
  }

  // Request 1, then request 2. The landlord only presses one button.
  async function save(values) {
    if (busy) return;
    setError('');
    setDetail('');
    const { details, files } = splitValues(values);

    let tenantId;
    try {
      setPhase('saving');
      const saved = isEdit ? await tenantsApi.update(id, details) : await tenantsApi.create(details);
      tenantId = saved.id;
    } catch (e) {
      setPhase(null);
      const message = showServerErrors(e) ? ERR.fixFields : errMsg(e, FAIL.tenantSave);
      setError(message);
      setDetail(serverDetail(e));
      toast.error(message);
      return;
    }

    refreshLists();
    if (Object.keys(files).length > 0) return sendDocuments(tenantId, files);
    toast.success(isEdit ? OK.tenantUpdated : OK.tenantAdded);
    openTenant(tenantId);
  }

  async function next(e) {
    e.preventDefault();
    if (isLast) return f.handleSubmit(save)(e);
    const names = current.f.map(([name]) => name);
    if (await f.trigger(names, { shouldFocus: true })) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    }
  }

  function goTo(index) {
    setStep(index);
    window.scrollTo(0, 0);
  }

  // The tenant exists but a file did not upload. Do not show the form again:
  // saving it a second time would create a duplicate tenant.
  if (partial) {
    return (
      <>
        <PageHeader title="Tenant saved" />
        <Card className="max-w-xl space-y-4 p-6">
          <Notice>{partial.message}</Notice>
          <p className="text-sm text-slate-600">Tenant details are saved safely.</p>
          <div className="flex flex-wrap gap-2">
            <Button loading={busy} onClick={() => sendDocuments(partial.tenantId, partial.files, true)}>
              {busy ? `Uploading documents… ${percent}%` : 'Retry upload'}
            </Button>
            <button className={btn2} disabled={busy} onClick={() => openTenant(partial.tenantId)}>
              Go to tenant
            </button>
          </div>
        </Card>
      </>
    );
  }

  if (!isEdit && apartmentOptions.length === 0) {
    return (
      <>
        <PageHeader title="Add tenant" back={{ to: '/tenants', label: 'Back to tenants' }} />
        <Card className="max-w-xl space-y-4 p-6">
          <p className="text-sm text-slate-700">Every apartment has a tenant. Add an apartment before adding a tenant.</p>
          <Link className={btn} to="/apartments/new">
            Add apartment
          </Link>
        </Card>
      </>
    );
  }

  const label =
    phase === 'saving'
      ? 'Saving tenant…'
      : phase === 'uploading'
        ? `Uploading documents… ${percent}%`
        : isLast
          ? isEdit
            ? 'Save changes'
            : 'Create tenant'
          : 'Next';

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit tenant' : 'Add tenant'}
        subtitle={isEdit ? tenantName(initial) : 'Fill in the details, one step at a time.'}
        back={{ to: isEdit ? `/tenants/${id}` : '/tenants', label: isEdit ? 'Back to tenant' : 'Back to tenants' }}
      />

      <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
        <aside className="md:pt-2">
          <Steps step={step} goTo={goTo} />
        </aside>

        <Card className="p-6">
          <form onSubmit={next} noValidate>
            <h2 className="mb-5 text-xl font-semibold text-ink-900">{current.t}</h2>
            <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
              {current.f.map(([name, fieldLabel, ty]) => (
                <div key={name} className={isWide(ty) ? 'md:col-span-2' : ''}>
                  <Field
                    f={f}
                    name={name}
                    label={fieldLabel}
                    ty={ty}
                    options={name === 'apartment' ? apartmentOptions : []}
                    rules={RULES[name]}
                    current={initial && DOC_FIELDS.includes(name) ? docUrl(initial, name) || undefined : undefined}
                  />
                </div>
              ))}
            </div>

            {phase === 'uploading' && (
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-brand-600 transition-[width]" style={{ width: `${percent}%` }} />
              </div>
            )}
            {error && (
              <div className="mt-5">
                <Notice>{error}</Notice>
                <DevDetail text={detail} />
              </div>
            )}

            <div className="mt-6 flex gap-2 border-t border-line pt-5">
              {step > 0 && (
                <button type="button" className={btn2} disabled={busy} onClick={() => goTo(step - 1)}>
                  Back
                </button>
              )}
              <Button type="submit" loading={busy}>
                {label}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

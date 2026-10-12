import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apartmentsApi } from '../api/apartments';
import { tenantsApi } from '../api/tenants';
import { confirm } from '../store/confirm';
import { toast } from '../store/toast';
import { errMsg, isNotFound } from '../lib/format';
import { ERR, FAIL, OK } from '../lib/messages';
import { tenantName, tenantPhone, tenantPhoto, withOccupancy } from '../lib/tenant';
import Avatar from '../components/Avatar';
import ReportActions from '../components/ReportActions';
import { apartmentReport } from '../lib/report';
import Icon from '../components/Icon';
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, PageSkeleton, btn, btn2 } from '../components/ui';

export default function ApartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const apartment = useQuery({ queryKey: ['apartment', id], queryFn: () => apartmentsApi.get(id) });
  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.list });

  const del = useMutation({
    mutationFn: () => apartmentsApi.remove(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['apartment', id] });
      qc.invalidateQueries({ queryKey: ['apartments'] });
      toast.success(OK.apartmentDeleted);
      navigate('/apartments');
    },
    onError: (e) => toast.error(errMsg(e, FAIL.apartmentDelete)),
  });

  if (apartment.error) {
    const gone = isNotFound(apartment.error);
    return (
      <ErrorBox
        message={gone ? ERR.apartmentGone : errMsg(apartment.error, FAIL.apartmentLoad)}
        onRetry={gone ? undefined : apartment.refetch}
        back={{ to: '/apartments', label: 'Back to apartments' }}
      />
    );
  }
  if (!apartment.data) return <PageSkeleton />;

  const [A] = withOccupancy([apartment.data], tenants.data || []);
  const tenant = A.tenantRecord;

  async function onDelete() {
    const yes = await confirm({
      title: 'Delete this apartment?',
      message: `Apartment ${A.apartmentNumber} will be removed for good. This cannot be undone.`,
      confirmLabel: 'Delete apartment',
      danger: true,
    });
    if (yes) del.mutate();
  }

  return (
    <>
      <PageHeader
        title={`Apartment ${A.apartmentNumber}`}
        subtitle={A.address}
        back={{ to: '/apartments', label: 'Back to apartments' }}
      >
        <ReportActions
          build={async () => {
            // The list may hold a short copy of the tenant, so fetch the full record for the report.
            const full = tenant ? await tenantsApi.get(tenant.id).catch(() => tenant) : null;
            return apartmentReport(A, full);
          }}
        />
        <Link className={btn2} to={`/apartments/${id}/edit`}>
          <Icon name="pencil" className="h-4 w-4" />
          Edit apartment
        </Link>
        <Button
          variant="dangerLine"
          icon="trash"
          loading={del.isPending}
          disabled={!!tenant || tenants.isLoading}
          title={tenant ? 'Remove the tenant before deleting this apartment' : undefined}
          onClick={onDelete}
        >
          Delete apartment
        </Button>
      </PageHeader>

      {tenant && (
        <p className="mb-4 text-sm text-slate-500">
          This apartment has a tenant. Remove the tenant before deleting the apartment.
        </p>
      )}

      <div className="grid items-start gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink-900">Details</h2>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-3 text-sm">
            <dt className="text-slate-500">Type</dt>
            <dd className="font-medium">{A.type}</dd>
            <dt className="text-slate-500">Address</dt>
            <dd className="font-medium">{A.address}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd><Badge v={A.status} /></dd>
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink-900">Tenant</h2>
          {tenant ? (
            <Link to={`/tenants/${tenant.id}`} className="flex items-center gap-4 rounded-lg p-2 -m-2 hover:bg-slate-50">
              <Avatar src={tenantPhoto(tenant)} name={tenantName(tenant)} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{tenantName(tenant)}</span>
                <span className="block text-sm text-slate-500">{tenantPhone(tenant)}</span>
              </span>
              <Icon name="chevron-right" className="h-5 w-5 text-slate-400" />
            </Link>
          ) : (
            <EmptyState
              icon="users"
              title="No tenant yet"
              text="Add a tenant and choose this apartment."
              action={<Link className={btn} to="/tenants/new">Add tenant</Link>}
            />
          )}
        </Card>
      </div>
    </>
  );
}

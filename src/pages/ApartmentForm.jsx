import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apartmentsApi } from '../api/apartments';
import { toast } from '../store/toast';
import { errMsg, fieldErrors, isNotFound, serverDetail } from '../lib/format';
import { ERR, FAIL, OK } from '../lib/messages';
import Field from '../components/Field';
import { SPEC } from '../lib/validators';
import { Button, Card, DevDetail, ErrorBox, Notice, PageHeader, PageSkeleton, btn2 } from '../components/ui';

const TYPES = 'select:Studio,1 Bedroom,2 Bedroom,3 Bedroom,4 Bedroom';

export default function ApartmentForm() {
  const { id } = useParams();
  // A copy loaded in the last 2 minutes (for example from the apartment's page) is reused.
  const q = useQuery({
    queryKey: ['apartment', id],
    queryFn: () => apartmentsApi.get(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  if (id && q.isLoading) return <PageSkeleton />;
  if (id && q.isError && !q.data) {
    return (
      <ErrorBox
        message={isNotFound(q.error) ? ERR.apartmentGone : errMsg(q.error, FAIL.apartmentLoad)}
        onRetry={isNotFound(q.error) ? undefined : q.refetch}
        back={{ to: '/apartments', label: 'Back to apartments' }}
      />
    );
  }
  // key: opening "Add" after "Edit" must start with an empty form.
  return <Inner key={id || 'new'} id={id} initial={q.data} />;
}

function Inner({ id, initial }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const f = useForm({
    mode: 'onTouched',
    defaultValues: {
      apartmentNumber: initial?.apartmentNumber ?? '',
      address: initial?.address ?? '',
      type: initial?.type ?? '',
      status: initial?.status ?? 'Vacant',
    },
  });
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');

  const save = useMutation({
    mutationFn: (data) => (id ? apartmentsApi.update(id, data) : apartmentsApi.create(data)),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['apartment'] });
      qc.invalidateQueries({ queryKey: ['apartments'] });
      toast.success(id ? OK.apartmentUpdated : OK.apartmentAdded);
      navigate('/apartments');
    },
    onError: (e) => {
      const fields = fieldErrors(e);
      Object.entries(fields).forEach(([name, message]) => f.setError(name, { type: 'server', message }));
      const message = Object.keys(fields).length ? ERR.fixFields : errMsg(e, FAIL.apartmentSave);
      setError(message);
      setDetail(serverDetail(e));
      toast.error(message);
    },
  });

  return (
    <>
      <PageHeader
        title={id ? 'Edit apartment' : 'Add apartment'}
        back={{ to: id ? `/apartments/${id}` : '/apartments', label: id ? 'Back to apartment' : 'Back to apartments' }}
      />
      <Card className="max-w-xl p-6">
        <form
          onSubmit={f.handleSubmit((data) => {
            setError('');
            save.mutate(data);
          })}
          className="space-y-4"
          noValidate
        >
          <Field f={f} name="apartmentNumber" label="Apartment Number" rules={SPEC.apartmentNumber} />
          <Field f={f} name="address" label="Address" rules={SPEC.address} />
          <Field f={f} name="type" label="Type" ty={TYPES} />
          <Field f={f} name="status" label="Status" ty="radio:Vacant,Occupied" />
          {error && (
            <div>
              <Notice>{error}</Notice>
              <DevDetail text={detail} />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={save.isPending}>
              {save.isPending ? 'Saving…' : id ? 'Save changes' : 'Add apartment'}
            </Button>
            <Link className={btn2} to={id ? `/apartments/${id}` : '/apartments'}>
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </>
  );
}

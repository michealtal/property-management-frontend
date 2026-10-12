import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi, mergeUser } from '../api/auth';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import { errMsg, fieldErrors } from '../lib/format';
import { ERR, FAIL, OK } from '../lib/messages';
import Avatar from '../components/Avatar';
import Field from '../components/Field';
import { SPEC } from '../lib/validators';
import { Button, Card, Notice, PageHeader } from '../components/ui';

const EDITABLE = ['firstName', 'lastName', 'email', 'phone'];

function DetailsForm() {
  const user = useAuth((s) => s.user) || {};
  const setUser = useAuth((s) => s.setUser);
  const f = useForm({
    mode: 'onTouched',
    defaultValues: { firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone },
  });
  const [error, setError] = useState('');

  function fail(message) {
    setError(message);
    toast.error(message);
  }

  const submit = f.handleSubmit(async ({ profilePicture, ...values }) => {
    setError('');
    // Send only what changed: the server updates just those fields.
    const changes = {};
    EDITABLE.forEach((key) => {
      if (values[key] !== user[key]) changes[key] = values[key];
    });

    let current = user;
    if (Object.keys(changes).length > 0) {
      try {
        const saved = await authApi.update(user.id, changes);
        current = mergeUser({ ...user, ...changes }, saved);
        setUser(current);
      } catch (e) {
        const named = fieldErrors(e);
        Object.entries(named).forEach(([name, message]) => f.setError(name, { type: 'server', message }));
        return fail(Object.keys(named).length ? ERR.fixFields : errMsg(e, FAIL.profile));
      }
    }

    if (profilePicture) {
      try {
        const link = await authApi.uploadPicture(profilePicture, { id: user.id });
        // If the server gave no link back, show the photo just chosen until the next refresh.
        setUser(mergeUser(current, { profilePicture: link || URL.createObjectURL(profilePicture) }));
        f.setValue('profilePicture', null);
      } catch (e) {
        // The details are already saved, so the message names the picture as the only thing missing.
        return fail(errMsg(e, FAIL.picture));
      }
    }
    toast.success(OK.profileSaved);
  });

  return (
    <Card className="max-w-xl p-6">
      <h2 className="text-lg font-semibold text-ink-900">Your details</h2>
      <div className="my-5 flex items-center gap-4">
        <Avatar src={user.profilePicture} name={user.firstName} size="lg" />
        <p className="text-sm text-slate-500">This is how you appear in the sidebar.</p>
      </div>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field f={f} name="firstName" label="First Name" rules={SPEC.name(40)} />
          <Field f={f} name="lastName" label="Last Name" rules={SPEC.name(40)} />
        </div>
        <Field f={f} name="email" label="Email" ty="email" />
        <Field f={f} name="phone" label="Phone" ty="tel" />
        <Field f={f} name="profilePicture" label="Profile Picture" ty="file:image?" current={user.profilePicture} />
        {error && <Notice>{error}</Notice>}
        <Button type="submit" loading={f.formState.isSubmitting}>
          {f.formState.isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </Card>
  );
}

export default function Profile() {
  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." />
      <DetailsForm />
    </>
  );
}

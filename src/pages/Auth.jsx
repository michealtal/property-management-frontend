import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi, mergeUser } from '../api/auth';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import { errMsg, fieldErrors, serverDetail } from '../lib/format';
import { ERR, FAIL, OK, V } from '../lib/messages';
import Building from '../components/Building';
import Field from '../components/Field';
import { SPEC } from '../lib/validators';
import Logo from '../components/Logo';
import { Button, DevDetail, Notice } from '../components/ui';

// A fixed sample block for the brand panel. Which windows are lit is just a pattern.
const SAMPLE = [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0].map((lit, i) => ({ id: i, label: '', occupied: !!lit }));

function AuthShell({ title, subtitle, children }) {
  useEffect(() => {
    document.title = `${title} – House Management`;
  }, [title]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between bg-ink-900 p-10 lg:flex">
        <Logo light />
        <div>
          <Building units={SAMPLE} decorative />
          <h2 className="mx-auto mt-10 max-w-md text-center text-4xl font-bold leading-tight text-white">
            Know who lives in every home.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-center text-slate-400">
            Apartments, tenants and their documents, kept in one place you can trust.
          </p>
        </div>
        <p className="text-sm text-slate-500">Built for landlords who manage their own properties.</p>
      </section>

      <section className="flex items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold text-ink-900">{title}</h1>
          <p className="mb-7 mt-1.5 text-slate-500">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}

export function Login() {
  const f = useForm();
  const navigate = useNavigate();
  const { state } = useLocation();
  const login = useAuth((s) => s.login);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state?.registered) toast.success(OK.registered);
  }, [state]);

  const submit = f.handleSubmit(async (data) => {
    setError('');
    try {
      const res = await authApi.login(data);
      login(res.token, res.user);
      toast.success(OK.welcome(res.user?.firstName));
      navigate('/dashboard');
    } catch (e) {
      const message = errMsg(e, FAIL.login, { 400: ERR.loginWrong, 401: ERR.loginWrong, 404: ERR.loginWrong });
      setError(message);
      toast.error(message);
    }
  });

  return (
    <AuthShell title="Log in" subtitle="Manage your apartments and tenants.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field f={f} name="email" label="Email" ty="email" autoComplete="email" />
        <Field f={f} name="password" label="Password" ty={show ? 'text' : 'password'} autoComplete="current-password" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="accent-[var(--color-brand-600)]" onChange={(e) => setShow(e.target.checked)} />
          Show password
        </label>
        {error && <Notice>{error}</Notice>}
        <Button type="submit" loading={f.formState.isSubmitting} className="w-full">
          {f.formState.isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
        <p className="text-sm text-slate-600">
          New landlord?{' '}
          <Link className="font-semibold text-brand-700 hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const f = useForm({ mode: 'onTouched' });
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const [phase, setPhase] = useState(null); // null | 'registering' | 'uploading'
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');
  const busy = phase !== null;

  // One button, up to three requests: register, log in (if register gave no token), upload the picture.
  const submit = f.handleSubmit(async ({ profilePicture, ...fields }) => {
    setError('');
    let session;
    try {
      setPhase('registering');
      session = await authApi.register(fields);
    } catch (e) {
      // The server may name the field that is wrong, such as an email already in use.
      const named = fieldErrors(e);
      Object.entries(named).forEach(([name, message]) => f.setError(name, { type: 'server', message }));
      const message = Object.keys(named).length ? ERR.fixFields : errMsg(e, FAIL.register);
      setError(message);
      setDetail(serverDetail(e));
      toast.error(message);
      setPhase(null);
      return;
    }

    try {
      if (!session.token) session = await authApi.login({ email: fields.email, password: fields.password });
    } catch {
      // The account exists, only the automatic login failed. Send them to log in by hand.
      toast.success(OK.registered);
      navigate('/login');
      return;
    }

    let pictureProblem = '';
    if (profilePicture) {
      setPhase('uploading');
      try {
        // The token is passed along directly: it is not stored yet, so the page stays put until we finish.
        const link = await authApi.uploadPicture(profilePicture, { token: session.token, id: session.user.id });
        session = {
          ...session,
          user: mergeUser(session.user, { profilePicture: link || URL.createObjectURL(profilePicture) }),
        };
      } catch (e) {
        pictureProblem = errMsg(e, FAIL.picture);
      }
    }

    login(session.token, session.user);
    toast.success(OK.accountReady);
    if (pictureProblem) toast.error(pictureProblem); // the account is fine; only the picture is missing
    navigate('/dashboard');
  });

  return (
    <AuthShell title="Create your account" subtitle="Set up your landlord profile in a minute.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field f={f} name="firstName" label="First Name" autoComplete="given-name" rules={SPEC.name(40)} />
          <Field f={f} name="lastName" label="Last Name" autoComplete="family-name" rules={SPEC.name(40)} />
        </div>
        <Field f={f} name="email" label="Email" ty="email" autoComplete="email" />
        <Field f={f} name="phone" label="Phone" ty="tel" autoComplete="tel" />
        <Field
          f={f}
          name="password"
          label="Password"
          ty="password"
          autoComplete="new-password"
          rules={{ ...SPEC.password, minLength: { value: 8, message: V.passwordShort } }}
        />
        <Field
          f={f}
          name="confirmPassword"
          label="Confirm Password"
          ty="password"
          autoComplete="new-password"
          rules={{ validate: (v) => v === f.getValues('password') || V.passwordMismatch }}
        />
        <Field f={f} name="profilePicture" label="Profile Picture" ty="file:image?" />
        {error && (
          <div>
            <Notice>{error}</Notice>
            <DevDetail text={detail} />
          </div>
        )}
        <Button type="submit" loading={busy} className="w-full">
          {phase === 'uploading' ? 'Uploading profile picture…' : busy ? 'Registering…' : 'Create account'}
        </Button>
        <p className="text-sm text-slate-600">
          Have an account?{' '}
          <Link className="font-semibold text-brand-700 hover:underline" to="/login">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

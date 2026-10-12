import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { authApi, mergeUser } from './api/auth';
import { useAuth } from './store/auth';
import { toast } from './store/toast';
import { ERR, OK } from './lib/messages';
import Avatar from './components/Avatar';
import ConfirmHost from './components/ConfirmHost';
import Icon from './components/Icon';
import Logo, { LogoMark } from './components/Logo';
import ServerBanner from './components/ServerBanner';
import Toasts from './components/Toasts';
import { PageSkeleton } from './components/ui';
import { Login, Register } from './pages/Auth';

// Only the login pages load up front. Every other page downloads when it is first opened,
// so the first screen appears sooner.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const ApartmentList = lazy(() => import('./pages/ApartmentList'));
const ApartmentForm = lazy(() => import('./pages/ApartmentForm'));
const ApartmentDetail = lazy(() => import('./pages/ApartmentDetail'));
const TenantList = lazy(() => import('./pages/TenantList'));
const TenantForm = lazy(() => import('./pages/TenantForm'));
const TenantDetail = lazy(() => import('./pages/TenantDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));

const NAV = [
  ['/dashboard', 'Dashboard', 'dashboard'],
  ['/apartments', 'Apartments', 'building'],
  ['/tenants', 'Tenants', 'users'],
  ['/profile', 'Profile', 'user'],
];

// Pages that need a logged-in landlord.
function Guard() {
  const token = useAuth((s) => s.token);
  return token ? <Layout /> : <Navigate to="/login" replace />;
}

// Login and register pages bounce a logged-in landlord to the dashboard.
function GuestOnly({ children }) {
  const token = useAuth((s) => s.token);
  return token ? <Navigate to="/dashboard" replace /> : children;
}

// Tells the landlord when the connection drops and when it comes back.
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => {
      setOnline(true);
      toast.success(OK.backOnline);
    };
    const down = () => {
      setOnline(false);
      toast.error(ERR.offline);
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

function Layout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const setUser = useAuth((s) => s.setUser);
  const navigate = useNavigate();
  const online = useOnline();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  // The saved user can be old (for example, without the newest profile picture). Refresh it quietly once.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    let live = true;
    authApi
      .get(userId)
      .then((fresh) => live && setUser(mergeUser(useAuth.getState().user, fresh)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId, setUser]);

  function signOut() {
    logout();
    navigate('/login');
    toast.success(OK.loggedOut);
  }

  return (
    <div className="min-h-screen md:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink-900 p-4 text-slate-300 md:flex">
        <div className="px-2 py-3">
          <Logo light />
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-ink-700 text-white' : 'hover:bg-ink-800 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={icon} className={`h-5 w-5 ${isActive ? 'text-glow-400' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-ink-800 p-3">
          <div className="flex items-center gap-3">
            <Avatar src={user?.profilePicture} name={user?.firstName || ''} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{fullName || 'Landlord'}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-300 hover:bg-ink-700 hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
            Log out
          </button>
        </div>
        {import.meta.env.DEV && <p className="mt-3 px-1 text-xs text-slate-500">Version {__APP_VERSION__}</p>}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-3 md:hidden">
        <span className="flex items-center gap-2.5 font-display font-bold text-white">
          <LogoMark className="h-8 w-8" />
          House Management
        </span>
        <button onClick={signOut} aria-label="Log out" className="rounded-lg p-2 text-slate-300 hover:bg-ink-700">
          <Icon name="logout" className="h-5 w-5" />
        </button>
      </header>

      {!online && (
        <div role="status" className="flex items-center gap-2 bg-glow-400 px-4 py-2 text-sm font-semibold text-ink-900">
          <Icon name="wifi" className="h-4 w-4" />
          {ERR.offlineBanner}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white md:hidden">
        {NAV.map(([to, label, icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${isActive ? 'text-brand-700' : 'text-slate-500'}`
            }
          >
            <Icon name={icon} className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route element={<Guard />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/apartments" element={<ApartmentList />} />
          <Route path="/apartments/new" element={<ApartmentForm />} />
          <Route path="/apartments/:id" element={<ApartmentDetail />} />
          <Route path="/apartments/:id/edit" element={<ApartmentForm />} />
          <Route path="/tenants" element={<TenantList />} />
          <Route path="/tenants/new" element={<TenantForm />} />
          <Route path="/tenants/:id" element={<TenantDetail />} />
          <Route path="/tenants/:id/edit" element={<TenantForm />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toasts />
      <ServerBanner />
      <ConfirmHost />
    </>
  );
}

import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { btn } from '../components/ui';
import { ERR } from '../lib/messages';

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <LogoMark className="mx-auto mb-5 h-12 w-12" />
        <h1 className="text-3xl font-bold text-ink-900">{ERR.notFoundPage}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
          The address may be mistyped, or the page was moved.
        </p>
        <Link to="/dashboard" className={`${btn} mt-6`}>
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

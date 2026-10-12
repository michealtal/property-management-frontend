import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '../api/tenants';
import { toast } from '../store/toast';
import { errMsg } from '../lib/format';
import { FILE_KINDS, MAX_FILE_MB, checkFile } from '../lib/files';
import { previewUrl, shrinkImage } from '../lib/image';
import { docUrl } from '../lib/tenant';
import { FAIL, OK } from '../lib/messages';
import Icon from './Icon';
import { Card, Spinner } from './ui';

// [key sent to the server, label, kind of file allowed]
export const DOC_LIST = [
  ['passportPhoto', 'Passport Photograph', 'image'],
  ['idDocument', 'ID Document', 'document'],
  ['workId', 'Work ID', 'document'],
];

const isPdf = (url) => /\.pdf($|[?#])/i.test(url) || /\/raw\/upload\//.test(url);

const small =
  'inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60';

function Preview({ url, label }) {
  const [broken, setBroken] = useState(false);
  if (isPdf(url) || broken) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="grid h-56 place-items-center rounded-lg bg-slate-100 text-center text-sm text-slate-600 hover:bg-slate-200/70">
        <span>
          <Icon name="file" className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          {isPdf(url) ? 'PDF document. Click to open.' : 'Preview unavailable. Click to open.'}
        </span>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-slate-100">
      <img
        src={previewUrl(url)}
        alt={label}
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-56 w-full object-contain"
      />
    </a>
  );
}

function DocCard({ tenant, id, docKey, label, kind }) {
  const qc = useQueryClient();
  const input = useRef(null);
  const url = docUrl(tenant, docKey);
  const [shown, setShown] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  async function pick(event) {
    const chosen = event.target.files?.[0];
    event.target.value = ''; // so the same file can be picked again
    if (!chosen) return;
    const check = checkFile(chosen, kind);
    if (check !== true) {
      setProblem(check);
      return;
    }
    setProblem('');
    setBusy(true);
    try {
      const file = await shrinkImage(chosen);
      await tenantsApi.uploadDocuments(id, { [docKey]: file });
      qc.removeQueries({ queryKey: ['tenant', id], exact: true });
      await qc.invalidateQueries({ queryKey: ['tenant', id] });
      qc.invalidateQueries({ queryKey: ['tenants'] });
      setShown(true);
      toast.success(OK.docsUploaded);
    } catch (e) {
      toast.error(errMsg(e, FAIL.documents));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{label}</h3>
        <span className={`text-xs font-semibold ${url ? 'text-ok-700' : 'text-slate-400'}`}>{url ? 'Uploaded' : 'Not uploaded'}</span>
      </div>

      {url && shown && <Preview url={url} label={label} />}
      {url && !shown && (
        <div className="grid h-56 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          Hidden
        </div>
      )}
      {!url && (
        <div className="grid h-56 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">
          <span>
            <Icon name="upload" className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            Nothing uploaded yet
          </span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {url && (
          <button type="button" className={small} onClick={() => setShown((v) => !v)} aria-pressed={shown}>
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
        <button type="button" className={small} disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon name={url ? 'pencil' : 'upload'} className="h-3.5 w-3.5" />}
          {busy ? 'Uploading…' : url ? 'Change' : 'Upload'}
        </button>
        <input ref={input} type="file" hidden accept={FILE_KINDS[kind].accept} onChange={pick} />
      </div>
      {problem ? (
        <p role="alert" className="mt-2 text-xs font-medium text-bad-700">
          {problem}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          {FILE_KINDS[kind].hint}, up to {MAX_FILE_MB} MB
        </p>
      )}
    </Card>
  );
}

// The three tenant documents: always previewed, can be hidden, replaced or uploaded right here.
export default function TenantDocs({ tenant, id }) {
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      {DOC_LIST.map(([key, label, kind]) => (
        <DocCard key={key} tenant={tenant} id={id} docKey={key} label={label} kind={kind} />
      ))}
    </div>
  );
}

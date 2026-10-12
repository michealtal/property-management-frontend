import { useEffect, useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { FILE_KINDS, MAX_FILE_MB, checkFile, formatSize } from '../lib/files';
import { shrinkImage } from '../lib/image';
import { V } from '../lib/messages';
import Icon from './Icon';
import { FieldError, inp, labelText } from './ui';

function Thumb({ file }) {
  const url = useMemo(
    () => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null),
    [file]
  );
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  if (!url) {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon name="file" />
      </span>
    );
  }
  return <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />;
}

// A file picker wired to react-hook-form. The chosen File lives in form state, so it
// is still there when the landlord goes Back and Next between steps.
// `current` is the link to a file that is already uploaded (edit mode).
export default function FileField({ control, name, label, kind = 'document', optional = true, current }) {
  const rules = FILE_KINDS[kind];
  const [inputKey, setInputKey] = useState(0);

  return (
    <Controller
      control={control}
      name={name}
      rules={{
        validate: (file) => {
          if (!file) return optional || current ? true : V.required(label);
          return checkFile(file, kind);
        },
      }}
      render={({ field, fieldState }) => {
        const problem = field.value ? checkFile(field.value, kind) : true;
        const message = problem !== true ? problem : fieldState.error?.message;
        return (
          <div>
            <span className={labelText}>
              {label}
              {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
            </span>

            {field.value ? (
              <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-2.5">
                <Thumb file={field.value} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{field.value.name}</p>
                  <p className="text-xs text-slate-500">{formatSize(field.value.size)}</p>
                </div>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-sm font-semibold text-bad-700 hover:bg-bad-50"
                  onClick={() => {
                    field.onChange(null);
                    setInputKey((n) => n + 1);
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                {current && (
                  <p className="mb-2 text-sm text-slate-600">
                    Already uploaded.{' '}
                    <a href={current} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">
                      View file
                    </a>
                    . Choose a new file to replace it.
                  </p>
                )}
                <input
                  key={inputKey}
                  type="file"
                  accept={rules.accept}
                  className={inp}
                  onBlur={field.onBlur}
                  onChange={async (e) => {
                    const picked = e.target.files?.[0];
                    // Big phone photos are shrunk here, so they upload faster and fit the size limit.
                    field.onChange(picked ? await shrinkImage(picked) : null);
                  }}
                />
              </>
            )}

            <p className="mt-1.5 text-xs text-slate-500">
              {rules.hint}, up to {MAX_FILE_MB} MB
            </p>
            <FieldError>{message}</FieldError>
          </div>
        );
      }}
    />
  );
}

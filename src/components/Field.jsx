import { get } from '../lib/format';
import { V } from '../lib/messages';
import { SPEC } from '../lib/validators';
import FileField from './FileField';
import { FieldError, inp, labelText } from './ui';

// One form field. `ty` is "type", "type:options", with a trailing "?" when optional.
//   text | email | tel | date | number | password | textarea | checkbox
//   select:A,B,C   radio:A,B   file:image   file:document
// `rules` adds react-hook-form rules (min, validate, ...) plus the extras from lib/validators.js:
//   clean (strip impossible characters while typing), normalize (tidy the value), attrs, inputMode.
// Email and phone fields get their rules automatically. `options` feeds a plain "select".
// `current` is the link to an already uploaded file (edit mode).
export default function Field({ f, name, label, ty = 'text', options = [], rules = {}, current, autoComplete }) {
  const optional = ty.includes('?');
  const [type, arg] = ty.replace('?', '').split(':');

  if (type === 'file') {
    return (
      <FileField control={f.control} name={name} label={label} kind={arg || 'document'} optional={optional} current={current} />
    );
  }

  const list = (arg ? arg.split(',') : options).map((x) => (typeof x === 'string' ? { v: x, l: x } : x));
  const error = get(f.formState.errors, name);

  const requiredMessage = type === 'select' ? V.select(label) : type === 'radio' ? V.choose : V.required(label);
  const base =
    type === 'checkbox'
      ? { validate: (v) => !!v || V.declaration }
      : {
          required: !optional && requiredMessage,
          ...(type === 'number' ? { min: { value: 0, message: V.min0 } } : {}),
        };
  const auto = type === 'email' ? SPEC.email : type === 'tel' ? SPEC.phone : {};
  const { clean, normalize, attrs, inputMode, ...own } = { ...auto, ...rules };
  const extra = typeof attrs === 'function' ? attrs() : attrs || {};
  const maxLength = own.maxLength?.value ?? (typeof own.maxLength === 'number' ? own.maxLength : undefined);
  const reg = f.register(name, {
    ...base,
    ...own,
    ...(normalize && type !== 'password' ? { setValueAs: normalize } : {}),
  });
  // Drops characters that can never be valid (digits in a name, letters in a phone number) as they are typed.
  const onChange = (event) => {
    const el = event.target;
    if (clean && typeof el?.value === 'string') {
      const cleaned = clean(el.value);
      if (cleaned !== el.value) el.value = cleaned;
    }
    return reg.onChange(event);
  };
  // A number box must not accept "e", "+" or "-", and the mouse wheel must not change it by accident.
  const numberKeys =
    type === 'number'
      ? {
          onKeyDown: (event) => ['e', 'E', '+', '-'].includes(event.key) && event.preventDefault(),
          onWheel: (event) => event.currentTarget.blur(),
        }
      : {};
  const message = <FieldError>{error && (error.message || V.required('This field'))}</FieldError>;
  const title = (
    <span className={labelText}>
      {label}
      {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
    </span>
  );

  if (type === 'checkbox') {
    return (
      <div>
        <label className="flex items-start gap-3 rounded-lg border border-line bg-slate-50 p-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]" {...reg} />
          {label}
        </label>
        {message}
      </div>
    );
  }

  if (type === 'radio') {
    return (
      <fieldset>
        <legend className={labelText}>
          {label}
          {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {list.map((x) => (
            <label
              key={x.v}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-800"
            >
              <input type="radio" value={x.v} className="accent-[var(--color-brand-600)]" {...reg} />
              {x.l}
            </label>
          ))}
        </div>
        {message}
      </fieldset>
    );
  }

  return (
    <label className="block">
      {title}
      {type === 'textarea' ? (
        <textarea rows={3} maxLength={maxLength} className={inp} aria-invalid={!!error} {...reg} onChange={onChange} />
      ) : type === 'select' ? (
        <select className={inp} aria-invalid={!!error} {...reg}>
          <option value="">Select an option</option>
          {list.length === 0 && (
            <option value="" disabled>
              No options available
            </option>
          )}
          {list.map((x) => (
            <option key={x.v} value={x.v}>
              {x.l}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          step={type === 'number' ? 'any' : undefined}
          autoComplete={autoComplete}
          maxLength={maxLength}
          inputMode={inputMode}
          spellCheck={type === 'email' || type === 'tel' ? false : undefined}
          className={inp}
          aria-invalid={!!error}
          {...extra}
          {...numberKeys}
          {...reg}
          onChange={onChange}
        />
      )}
      {message}
    </label>
  );
}

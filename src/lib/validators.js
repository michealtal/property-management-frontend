import { V } from './messages';
import { today } from './format';

// Real input rules. Each SPEC entry is passed to <Field rules={...}> and holds:
//   validate   the check (react-hook-form shape: (value, allValues) => true | message)
//   maxLength  hard limit, also set on the input itself
//   clean      strips characters that can never be valid while the user types (digits in a name, ...)
//   normalize  tidies the value that is validated and sent (trim, no double spaces, lowercase email, ...)
// Every validator accepts an empty value: "required" is decided by the field, not by the rule.

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const squash = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
const letters = (v) => (String(v).match(/\p{L}/gu) || []).length;
const digitsOnly = (v) => String(v).replace(/\D/g, '');
const limit = (n) => ({ value: n, message: V.tooLong });

// Run checks in order, stop at the first problem.
const chain =
  (...checks) =>
  (value, all) => {
    if (blank(value)) return true;
    for (const check of checks) {
      const result = check(value, all);
      if (result !== true) return result;
    }
    return true;
  };

// ---------- names ----------
const NAME_CHARS = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.\-]*$/u;
const cleanName = (s) => s.replace(/[^\p{L}\p{M}\s'’.\-]/gu, '');
const repeated = (v) => {
  const t = squash(v).toLowerCase().replace(/[\s'’.\-]/g, '');
  return new Set(t).size < 2 || /(\p{L})\1{3,}/u.test(t); // "aaaa", "xxxx"
};

const nameChecks = (v) => {
  const t = squash(v);
  if (!NAME_CHARS.test(t) || repeated(t)) return V.nameInvalid;
  if (letters(t) < 2) return V.nameShort;
  return true;
};

const name = (max = 60) => ({ maxLength: limit(max), clean: cleanName, normalize: squash, validate: chain(nameChecks) });

const fullName = {
  ...name(80),
  validate: chain(nameChecks, (v) => (squash(v).split(' ').filter((w) => letters(w) > 0).length >= 2 ? true : V.fullName)),
};

// ---------- phone and email ----------
const phoneOf = (v) => String(v ?? '').replace(/[\s()\-]/g, '');
const isPhone = (v) => {
  const p = phoneOf(v);
  return /^\+?\d{7,15}$/.test(p) && new Set(digitsOnly(p)).size > 2; // not 0000000 or 1111111
};
const EMAIL = /^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,}$/;
const isEmail = (v) => {
  const t = String(v).trim().toLowerCase();
  const [local] = t.split('@');
  return t.length <= 254 && local.length <= 64 && EMAIL.test(t) && !t.includes('..') && !local.startsWith('.') && !local.endsWith('.');
};

const phone = {
  maxLength: limit(20),
  inputMode: 'tel',
  clean: (s) => s.replace(/[^\d+\s()\-]/g, ''),
  normalize: phoneOf,
  validate: chain((v) => (isPhone(v) ? true : V.phone)),
};
const email = {
  maxLength: limit(254),
  inputMode: 'email',
  normalize: (s) => String(s ?? '').trim().toLowerCase(),
  validate: chain((v) => (isEmail(v) ? true : V.email)),
};
const contact = {
  maxLength: limit(254),
  normalize: (s) => {
    const t = String(s ?? '').trim();
    return t.includes('@') ? t.toLowerCase() : phoneOf(t);
  },
  validate: chain((v) => (isPhone(v) || isEmail(v) ? true : V.contact)),
};

// A phone number must not be the tenant's own (used for the emergency contact and the reference).
const notTenantPhone = (v, all) => {
  const own = phoneOf(all?.personalInformation?.phoneNumbers?.[0]);
  return own && phoneOf(v) === own ? V.ownNumber : true;
};
const notTenantName = (v, all) => {
  const own = squash(all?.personalInformation?.fullName).toLowerCase();
  return own && squash(v).toLowerCase() === own ? V.ownName : true;
};
const otherPhone = { ...phone, validate: chain((v) => (isPhone(v) ? true : V.phone), notTenantPhone) };
const otherName = { ...name(80), validate: chain(nameChecks, notTenantName) };

// ---------- free text ----------
const ADDRESS_CHARS = /^[\p{L}\p{N}\s,.\-\/#'’()&:;]+$/u;
const address = {
  maxLength: limit(200),
  normalize: squash,
  validate: chain((v) => {
    const t = squash(v);
    if (t.length < 5 || letters(t) < 3 || !ADDRESS_CHARS.test(t)) return V.addressInvalid;
    if (!/\d/.test(t) && !t.includes(' ')) return V.addressInvalid; // "Lagos" alone is not an address
    return true;
  }),
};

// Job titles: letters only. Employer names: letters and digits ("3M", "Eko Hotels & Suites").
const occupation = {
  maxLength: limit(60),
  clean: (s) => s.replace(/[^\p{L}\p{M}\s&.,'’\/\-()]/gu, ''),
  normalize: squash,
  validate: chain((v) => (letters(v) >= 2 && !repeated(v) ? true : V.textInvalid)),
};
const business = {
  maxLength: limit(80),
  clean: (s) => s.replace(/[^\p{L}\p{M}\p{N}\s&.,'’\/\-()]/gu, ''),
  normalize: squash,
  validate: chain((v) => (letters(v) >= 2 && !repeated(v) ? true : V.textInvalid)),
};
const relationship = {
  maxLength: limit(40),
  clean: (s) => s.replace(/[^\p{L}\p{M}\s'’\-]/gu, ''),
  normalize: squash,
  validate: chain((v) => (letters(v) >= 3 && NAME_CHARS.test(squash(v)) ? true : V.nameInvalid)),
};
const reason = {
  maxLength: limit(300),
  normalize: squash,
  validate: chain((v) => (letters(v) >= 3 && !/[<>{}\\|^~`$]/.test(v) ? true : V.reason)),
};
const duration = {
  maxLength: limit(40),
  normalize: squash,
  validate: chain((v) => (/\d/.test(v) && letters(v) >= 1 && /^[\p{L}\p{N}\s.,\-\/]+$/u.test(squash(v)) ? true : V.duration)),
};

// ---------- numbers ----------
const money = {
  inputMode: 'decimal',
  attrs: { step: '0.01', min: 0 },
  validate: chain((v) => {
    const t = String(v).trim();
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return V.money;
    if (n > 10_000_000_000) return V.moneyMax;
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return V.moneyDecimals;
    return true;
  }),
};
const integer = (min, max, tooBig) => ({
  inputMode: 'numeric',
  attrs: { step: 1, min, max },
  validate: chain((v) => {
    const t = String(v).trim();
    if (!/^\d+$/.test(t)) return V.wholeNumber;
    const n = Number(t);
    if (n < min) return V.occupants;
    if (n > max) return tooBig;
    return true;
  }),
});

// ---------- dates ----------
const parseDate = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
};
const shiftYears = (iso, years) => {
  const d = parseDate(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
};
const shiftDays = (iso, days) => new Date(parseDate(iso).getTime() + days * 86400000).toISOString().slice(0, 10);

const dob = {
  attrs: () => ({ max: shiftYears(today(), -18), min: shiftYears(today(), -120) }),
  validate: chain((v) => {
    if (!parseDate(v)) return V.dateInvalid;
    if (v > shiftYears(today(), -18)) return v > today() ? V.futureDate : V.under18;
    if (v < shiftYears(today(), -120)) return V.tooOld;
    return true;
  }),
};
const recentDate = {
  attrs: () => ({ max: today(), min: shiftDays(today(), -30) }),
  validate: chain((v) => {
    if (!parseDate(v)) return V.dateInvalid;
    if (v > today()) return V.futureDate;
    if (v < shiftDays(today(), -30)) return V.dateRecent;
    return true;
  }),
};

// ---------- identity ----------
const idNumber = {
  maxLength: limit(20),
  clean: (s) => s.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase(),
  normalize: (s) => String(s ?? '').trim().toUpperCase(),
  validate: chain((v, all) => {
    const t = String(v).trim().toUpperCase();
    if (all?.identification?.idType === 'National ID') return /^\d{11}$/.test(t) ? true : V.nin;
    return /^[A-Z0-9\-]{6,20}$/.test(t) && /\d/.test(t) && new Set(t).size > 2 ? true : V.idNumber;
  }),
};
const signature = {
  ...name(80),
  validate: chain(nameChecks, (v, all) => {
    const own = squash(all?.personalInformation?.fullName).toLowerCase();
    return !own || squash(v).toLowerCase() === own ? true : V.signatureMatch;
  }),
};

// ---------- account ----------
const password = {
  maxLength: { value: 64, message: V.passwordLong },
  validate: (v) => (blank(v) || (/\p{L}/u.test(v) && /\d/.test(v)) ? true : V.passwordWeak),
};
const apartmentNumber = {
  maxLength: limit(20),
  clean: (s) => s.replace(/[^A-Za-z0-9 \-\/]/g, ''),
  normalize: squash,
  validate: chain((v) => (/^[A-Za-z0-9][A-Za-z0-9 \-\/]{0,19}$/.test(squash(v)) ? true : V.apartmentNo)),
};

export const SPEC = {
  name,
  fullName,
  phone,
  email,
  contact,
  otherPhone,
  otherName,
  address,
  occupation,
  business,
  relationship,
  reason,
  duration,
  money,
  integer,
  dob,
  recentDate,
  idNumber,
  signature,
  password,
  apartmentNumber,
};

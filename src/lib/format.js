import { CAUSE, V, ERR, fits } from './messages';

// Read a nested value such as "emergencyContact.name" or "references.0.phone".
export const get = (obj, path) => path.split('.').reduce((value, key) => value?.[key], obj);

// Write a nested value: setIn(body, "references.0.name", "Ada") makes { references: [{ name: "Ada" }] }.
export function setIn(obj, path, value) {
  const keys = path.split('.');
  let node = obj;
  keys.slice(0, -1).forEach((key, i) => {
    // A numeric next key ("references.0.name") makes an array, not an object.
    node[key] = node[key] && typeof node[key] === 'object' ? node[key] : /^\d+$/.test(keys[i + 1]) ? [] : {};
    node = node[key];
  });
  node[keys[keys.length - 1]] = value;
  return obj;
}

// "apartmentNumber" -> "Apartment Number"
export const humanize = (key) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

// Why did the request fail? One short phrase, picked from the error or the HTTP status.
function causeOf(error) {
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return CAUSE.timeout;
    if (error?.request) return CAUSE.offline;
    return CAUSE.unknown;
  }
  const status = error.response.status;
  if (status === 401) return CAUSE.session;
  if (status === 403) return CAUSE.forbidden;
  if (status === 404) return CAUSE.missing;
  if (status === 409) return CAUSE.conflict;
  if (status === 413) return CAUSE.tooLarge;
  if (status === 415) return CAUSE.badType;
  if (status === 400 || status === 422) return CAUSE.invalid;
  if (status === 429) return CAUSE.busy;
  if (status >= 500) return CAUSE.server;
  return CAUSE.unknown;
}

// Build the message for a failed request: what failed, then why. Always 3 to 7 words.
//   errMsg(error, FAIL.tenantSave)           -> "Tenant not saved. Server unreachable."
//   errMsg(error, FAIL.login, {401: '...'})  -> a fixed message for one status code
export function errMsg(error, what, byStatus = {}) {
  const status = error?.response?.status;
  if (byStatus[status]) return byStatus[status];
  // The server's own wording is never shown: it can contain field paths, database terms or stack hints.
  return `${what} ${causeOf(error)}`;
}

export const isNotFound = (error) => error?.response?.status === 404;

// Which form fields did the server reject, and why? Understands these common shapes:
//   { errors: { email: "Email in use." } }            { errors: [{ path: "phone", msg: "..." }] }
//   Zod:     { errors: [{ path: ["a", "b"], message: "Required" }] }
//   Mongoose "X validation failed: a.b: Path `a.b` is required., c.d: `Foo` is not a valid enum value ..."
//   Joi:     '"a.b" is required'                       Mongo "E11000 duplicate key ... { email: ... }"
// Every message is turned into one short phrase of 3 to 7 words.
const KEY_IGNORED = ['landlord', 'user', 'owner'];

// A long technical reason becomes one short phrase.
function shortReason(text) {
  const t = String(text || '');
  if (/required|not allowed to be empty|cannot be empty|must not be empty/i.test(t)) return V.required('This field');
  if (/enum|must be one of|not a valid option|is not valid option/i.test(t)) return V.validOption;
  if (/cast to|must be a (number|string|boolean|date|valid)|is not a valid|invalid/i.test(t)) return V.validValue;
  if (/shorter than|longer than|at least|at most|length must|minimum|maximum/i.test(t)) return V.lengthWrong;
  // Server wording is shown only when it reads like a plain sentence, never like code ("a.b" is required).
  const plain = !/["`{}\[\]_<>\\]|\w\.\w|\$/.test(t);
  return plain && fits(t) ? t : ERR.invalidValue;
}

export function fieldErrors(error) {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return {};
  const out = {};
  const add = (name, text) => {
    if (name) out[String(name).replace(/\[(\d+)\]/g, '.$1')] = shortReason(text);
  };

  const raw = data.errors;
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (typeof item !== 'object') return;
      const path = Array.isArray(item.path) ? item.path.join('.') : (item.path ?? item.param ?? item.field);
      add(path, item.msg ?? item.message);
    });
  } else if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([name, value]) => {
      const first = Array.isArray(value) ? value[0] : value;
      add(name, typeof first === 'object' ? first?.message : first);
    });
  }
  if (Object.keys(out).length) return out;

  const message = typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : '';

  // Mongoose: everything after "validation failed:" is "path: reason, path: reason".
  const mongoose = message.match(/validation failed:\s*(.*)$/is);
  if (mongoose) {
    mongoose[1].split(/,\s+(?=[\w.]+:\s)/).forEach((part) => {
      const m = part.match(/^([\w.]+):\s*(.*)$/s);
      if (m) add(m[1], shortReason(m[2]));
    });
  }
  for (const m of message.matchAll(/`([\w.]+)` is required/g)) add(m[1], V.required('This field'));

  // Joi: "personalInformation.phone" is required
  for (const m of message.matchAll(/"([\w.\[\]]+)"\s+([^".,]+)/g)) add(m[1], shortReason(m[2]));

  const dup = message.match(/dup key:\s*\{([^}]*)\}/);
  if (dup) {
    const keys = [...dup[1].matchAll(/(\w+):/g)].map((m) => m[1]).filter((k) => !KEY_IGNORED.includes(k));
    const key = keys[keys.length - 1];
    if (key) add(key, key === 'apartment' ? 'Apartment already has a tenant.' : `${humanize(key)} already exists.`);
  }
  return out;
}

// The server's own words, for the developer. Shown only in development builds, never to landlords.
export function serverDetail(error) {
  const data = error?.response?.data;
  if (data === undefined || data === null) return '';
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return text.length > 800 ? `${text.slice(0, 800)}…` : text;
}

// Today as YYYY-MM-DD in the landlord's own time zone (toISOString would use UTC).
export function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const longToday = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export { V };

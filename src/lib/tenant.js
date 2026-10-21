import { get } from './format';
import { DOC_URL_PATHS, PAPER_URL_PATHS } from './uploadConfig';

// A file link can arrive as a string or as { url } / { secure_url }.
// Only web links and local previews are accepted: a "javascript:" link from the server is dropped.
const SAFE_LINK = /^(https?:\/\/|blob:)/i;
export function fileUrl(value) {
  if (!value) return '';
  const link = typeof value === 'string' ? value : value.secure_url || value.url || value.imageUrl || value.path || value.location || '';
  return typeof link === 'string' && SAFE_LINK.test(link.trim()) ? link.trim() : '';
}

// A tenant's `apartment` is either the apartment's id or the whole apartment object.
export function apartmentIdOf(tenant) {
  const apartment = tenant?.apartment;
  return apartment && typeof apartment === 'object' ? (apartment._id ?? apartment.id) : apartment;
}

// True for a link to a PDF (Cloudinary may store it as an image or as a raw file).
export const isPdfUrl = (url) => /\.pdf($|[?#])/i.test(url) || /\/raw\/upload\//.test(url);

export const tenantName = (t) => get(t, 'personalInformation.fullName') || 'Unnamed tenant';
export const tenantPhone = (t) => get(t, 'personalInformation.phoneNumbers.0') || '';
export const tenantEmail = (t) => get(t, 'personalInformation.email') || '';

// If the server names a file differently from the guesses in uploadConfig.js, look for it by name anywhere in the record.
const NAME_PATTERNS = {
  passportPhoto: /passport|photo|picture|portrait|avatar/i,
  idDocument: /^(id|identity|identification)(card|document|doc|image|file|upload|scan|photo|picture)?$|^id(card|document|doc|image|file|upload|scan)/i,
  workId: /work.?id|staff.?id|employ\w*.?(id|card|document|doc)\b/i,
  tenancyAgreement: /tenancy.?agreement/i,
  rentReceipt: /rent.?receipt/i,
};

function deepFind(node, pattern, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 4) return '';
  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === 'object') {
        const label = item.type ?? item.name ?? item.field ?? item.label ?? item.key ?? item.fieldname;
        const url = label !== undefined && pattern.test(String(label)) ? fileUrl(item) : '';
        if (url) return url;
      }
      const inner = deepFind(item, pattern, depth + 1);
      if (inner) return inner;
    }
    return '';
  }
  for (const [name, value] of Object.entries(node)) {
    if (pattern.test(name)) {
      const url = fileUrl(value);
      if (url) return url;
    }
  }
  for (const value of Object.values(node)) {
    const inner = deepFind(value, pattern, depth + 1);
    if (inner) return inner;
  }
  return '';
}

export function docUrl(tenant, key) {
  for (const path of DOC_URL_PATHS[key] || PAPER_URL_PATHS[key] || [key]) {
    const url = fileUrl(get(tenant, path));
    if (url) return url;
  }
  return NAME_PATTERNS[key] ? deepFind(tenant, NAME_PATTERNS[key]) : '';
}
export const tenantPhoto = (t) => docUrl(t, 'passportPhoto');

// Only nag about missing documents once the server is known to return file links at all.
export const docsTracked = (tenants) => tenants.some((t) => Object.keys(DOC_URL_PATHS).some((k) => docUrl(t, k)));
export const missingDocs = (t) => Object.keys(DOC_URL_PATHS).some((k) => !docUrl(t, k));

// An apartment is Occupied when it has a tenant, or when the landlord marked it Occupied.
// Also attaches the tenant's name and record for lists.
export function withOccupancy(apartments, tenants) {
  const byApartment = new Map(tenants.map((t) => [apartmentIdOf(t), t]));
  return apartments.map((a) => {
    const tenantRecord = byApartment.get(a.id);
    return {
      ...a,
      tenantRecord,
      tenant: tenantRecord ? tenantName(tenantRecord) : null,
      status: tenantRecord || a.status === 'Occupied' ? 'Occupied' : 'Vacant',
    };
  });
}

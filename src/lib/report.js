import { fmtDate, get } from './format';
import { docUrl, tenantEmail, tenantName, tenantPhone, tenantPhoto } from './tenant';
import { STEPS } from '../pages/tenantFields';

// One "report" describes everything to print or download for a tenant or an apartment:
//   { title, subtitle, filename, photo, sections: [{ title, rows: [[label, value]] }], docs: [{ label, url }], date }
// The printed page and the PDF are both drawn from this one shape, so they always agree.

const DOCS = [
  ['passportPhoto', 'Passport Photograph'],
  ['idDocument', 'ID Document'],
  ['workId', 'Work ID'],
];

const DASH = '—';

function text(tenant, name, type) {
  const raw = get(tenant, name);
  if (raw === undefined || raw === null || raw === '') return DASH;
  if (typeof raw === 'boolean') return type === 'checkbox' ? (raw ? 'Confirmed' : 'Not confirmed') : raw ? 'Yes' : 'No';
  if (type === 'date') return fmtDate(String(raw).slice(0, 10));
  if (type === 'number') return Number(raw).toLocaleString();
  return String(raw);
}

const kind = (ty) => ty.replace('?', '').split(':')[0];

function stamp() {
  return new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
}

// A file name that is safe on every system: accents are dropped (Ọlá becomes Ola) and odd symbols removed.
export const safeName = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w .\-()]+/g, ' ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'report';

export function apartmentRows(apartment) {
  return [
    ['Apartment Number', apartment.apartmentNumber || DASH],
    ['Type', apartment.type || DASH],
    ['Address', apartment.address || DASH],
    ['Status', apartment.status || DASH],
  ];
}

// Everything on file for one tenant: every form field, the apartment, and the uploaded documents.
export function tenantReport(tenant, apartment) {
  const name = tenantName(tenant);
  const sections = [];
  if (apartment) sections.push({ title: 'Apartment', rows: apartmentRows(apartment) });
  STEPS.forEach((step) => {
    const fields = step.f.filter(([fieldName, , ty]) => fieldName !== 'apartment' && !ty.startsWith('file'));
    if (!fields.length) return;
    sections.push({ title: step.t, rows: fields.map(([fieldName, label, ty]) => [label, text(tenant, fieldName, kind(ty))]) });
  });
  return {
    title: name,
    subtitle: apartment ? `Tenant of apartment ${apartment.apartmentNumber}` : 'Tenant record',
    filename: `Tenant - ${safeName(name)}`,
    photo: tenantPhoto(tenant),
    sections,
    docs: DOCS.map(([key, label]) => ({ label, url: docUrl(tenant, key) })),
    date: stamp(),
  };
}

// An apartment, who lives in it, and the key facts about that tenant. The full file is on the tenant's own page.
export function apartmentReport(apartment, tenant) {
  const sections = [{ title: 'Apartment details', rows: apartmentRows(apartment) }];
  if (tenant) {
    const pick = (label, name, ty = 'text') => [label, text(tenant, name, ty)];
    sections.push({
      title: 'Current tenant',
      rows: [
        ['Name', tenantName(tenant)],
        ['Phone', tenantPhone(tenant) || DASH],
        ['Email', tenantEmail(tenant) || DASH],
        pick('Number of Occupants', 'personalInformation.numberOfOccupants', 'number'),
        pick('Occupation', 'employmentInformation.occupation'),
        pick('Employer', 'employmentInformation.employerName'),
        pick('Emergency Contact', 'additionalInformation.emergencyContact.name'),
        pick('Emergency Contact Phone', 'additionalInformation.emergencyContact.phone'),
      ],
    });
  } else {
    sections.push({ title: 'Current tenant', rows: [['Tenant', 'None. This apartment is vacant.']] });
  }
  return {
    title: `Apartment ${apartment.apartmentNumber}`,
    subtitle: apartment.address || '',
    filename: `Apartment - ${safeName(apartment.apartmentNumber)}`,
    photo: '',
    sections,
    docs: [],
    date: stamp(),
  };
}

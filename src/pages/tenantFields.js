import { get, setIn, today } from '../lib/format';
import { SPEC } from '../lib/validators';
import { apartmentIdOf } from '../lib/tenant';
import { V } from '../lib/messages';

// Drives the 7-step tenant form, the tenant detail page, and the request body.
// Each field is [name, label, type]. The NAME IS THE PATH IN THE API BODY, so
// "personalInformation.firstName" is sent as { personalInformation: { firstName } }.
// Type syntax is in components/Field.jsx; a trailing "?" means optional.
//
// To add a field the backend supports: add one line here. Nothing else needs to change.
// Which fields are required, and the choices in each list, are best guesses until the
// backend's validation rules are known. Adjust them here.
export const STEPS = [
  {
    t: 'Personal Information',
    f: [
      ['apartment', 'Apartment', 'select'],
      ['personalInformation.fullName', 'Full Name', 'text'],
      ['personalInformation.dateOfBirth', 'Date of Birth', 'date'],
      ['personalInformation.maritalStatus', 'Marital Status', 'select:Single,Married,Divorced,Widowed'],
      ['personalInformation.gender', 'Gender', 'select:Male,Female,Other'],
      ['personalInformation.nationality', 'Nationality', 'text'],
      ['personalInformation.phoneNumbers.0', 'Phone Number', 'tel'],
      ['personalInformation.email', 'Email', 'email?'],
      ['personalInformation.currentResidentialAddress', 'Current Residential Address', 'textarea'],
      ['personalInformation.numberOfOccupants', 'Number of Occupants', 'number'],
    ],
  },
  {
    t: 'Employment & Financial',
    f: [
      ['employmentInformation.occupation', 'Occupation', 'text'],
      ['employmentInformation.employmentStatus', 'Employment Status', 'select:Full-Time,Part-Time,Self-Employed,Unemployed'],
      ['employmentInformation.employerName', 'Employer Name', 'text'],
      ['employmentInformation.employerAddress', 'Employer Address', 'textarea'],
      ['employmentInformation.income', 'Income', 'number'],
      ['employmentInformation.incomeFrequency', 'Income Frequency', 'select:Monthly,Annual'],
    ],
  },
  {
    t: 'Rental History',
    f: [
      ['rentalHistory.currentLandlordName', 'Current Landlord Name', 'text'],
      ['rentalHistory.currentLandlordContact', 'Current Landlord Contact (phone or email)', 'text'],
      ['rentalHistory.reasonForLeaving', 'Reason for Leaving', 'textarea'],
      ['rentalHistory.durationAtCurrentResidence', 'Duration at Current Residence', 'text'],
    ],
  },
  {
    t: 'References',
    f: [
      ['references.0.name', 'Reference Name', 'text'],
      ['references.0.phone', 'Reference Phone', 'tel'],
      ['references.0.relationship', 'Reference Relationship', 'text'],
    ],
  },
  {
    t: 'Identification',
    f: [
      ['identification.idType', 'ID Type', "select:International Passport,National ID,Driver's License,Voter's Card"],
      ['identification.idNumber', 'ID Number', 'text'],
      ['passportPhoto', 'Passport Photograph', 'file:image?'],
      ['idDocument', 'ID Document', 'file:document?'],
      ['workId', 'Work ID', 'file:document?'],
    ],
  },
  {
    t: 'Additional Information',
    f: [
      ['additionalInformation.hasPets', 'Do you have pets?', 'radio:Yes,No'],
      ['additionalInformation.smokes', 'Do you smoke?', 'radio:Yes,No'],
      ['additionalInformation.emergencyContact.name', 'Emergency Contact Name', 'text'],
      ['additionalInformation.emergencyContact.phone', 'Emergency Contact Phone', 'tel'],
      ['additionalInformation.emergencyContact.relationship', 'Emergency Contact Relationship', 'text'],
      ['additionalInformation.emergencyContact.address', 'Emergency Contact Address', 'textarea'],
    ],
  },
  {
    t: 'Declaration',
    f: [
      ['declaration.agreed', 'I confirm that the information provided is true and accurate.', 'checkbox'],
      ['declaration.signature', 'Signature (type your full name)', 'text'],
      ['declaration.date', 'Date', 'date'],
    ],
  },
];

export const ALL_FIELDS = STEPS.flatMap((step) => step.f);
const isFile = (ty) => ty.startsWith('file');

// Fields sent in the second request (the upload PATCH), never in the first.
export const DOC_FIELDS = ALL_FIELDS.filter(([, , ty]) => isFile(ty)).map(([name]) => name);

const NUMBER_FIELDS = ALL_FIELDS.filter(([, , ty]) => ty.startsWith('number')).map(([name]) => name);

// The form shows Yes / No; the API wants true / false.
const yes = (v) => v === 'Yes';
const TO_API = { 'additionalInformation.hasPets': yes, 'additionalInformation.smokes': yes };
const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : v);
const FROM_API = { 'additionalInformation.hasPets': yesNo, 'additionalInformation.smokes': yesNo };

// Validation and input rules, by field name. The rules themselves live in lib/validators.js.
export const RULES = {
  'personalInformation.fullName': SPEC.fullName,
  'personalInformation.dateOfBirth': SPEC.dob,
  'personalInformation.nationality': SPEC.name(56),
  'personalInformation.phoneNumbers.0': SPEC.phone,
  'personalInformation.email': SPEC.email,
  'personalInformation.currentResidentialAddress': SPEC.address,
  'personalInformation.numberOfOccupants': SPEC.integer(1, 20, V.occupantsMax),
  'employmentInformation.occupation': SPEC.occupation,
  'employmentInformation.employerName': SPEC.business,
  'employmentInformation.employerAddress': SPEC.address,
  'employmentInformation.income': SPEC.money,
  'rentalHistory.currentLandlordName': SPEC.name(80),
  'rentalHistory.currentLandlordContact': SPEC.contact,
  'rentalHistory.reasonForLeaving': SPEC.reason,
  'rentalHistory.durationAtCurrentResidence': SPEC.duration,
  'references.0.name': SPEC.otherName,
  'references.0.phone': SPEC.otherPhone,
  'references.0.relationship': SPEC.relationship,
  'identification.idNumber': SPEC.idNumber,
  'additionalInformation.emergencyContact.name': SPEC.otherName,
  'additionalInformation.emergencyContact.phone': SPEC.otherPhone,
  'additionalInformation.emergencyContact.relationship': SPEC.relationship,
  'additionalInformation.emergencyContact.address': SPEC.address,
  'declaration.signature': SPEC.signature,
  'declaration.date': SPEC.recentDate,
};

// Form values from a tenant the server returned (edit mode). Only fields the form knows are used,
// so nothing extra is ever sent back.
export function buildDefaults(tenant) {
  const values = {};
  if (!tenant) return { declaration: { date: today() } };
  ALL_FIELDS.forEach(([name, , ty]) => {
    if (isFile(ty)) return;
    let value = name === 'apartment' ? apartmentIdOf(tenant) : get(tenant, name);
    if (value === undefined || value === null) return;
    if (FROM_API[name]) value = FROM_API[name](value);
    if (ty.startsWith('date')) value = String(value).slice(0, 10);
    setIn(values, name, value);
  });
  return values;
}

// Splits the form into the two things the backend wants: the JSON details and the files.
export function splitValues(values) {
  const details = {};
  const files = {};
  ALL_FIELDS.forEach(([name, , ty]) => {
    const value = get(values, name);
    if (isFile(ty)) {
      if (value instanceof File) files[name] = value;
      return;
    }
    if (value === undefined || value === null || value === '') return; // empty optional fields are left out
    let out = value;
    if (NUMBER_FIELDS.includes(name)) out = Number(value);
    if (TO_API[name]) out = TO_API[name](value);
    setIn(details, name, out);
  });
  return { details, files };
}

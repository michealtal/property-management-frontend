// Every message the landlord sees lives here, so each one can be checked.
// Rule: every error and success message is 3 to 7 words. Run `npm run check:messages`.

export const MIN_WORDS = 3;
export const MAX_WORDS = 7;

export const countWords = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;

export const fits = (text) => {
  if (typeof text !== 'string') return false;
  const n = countWords(text);
  return n >= MIN_WORDS && n <= MAX_WORDS;
};

// An action failed. Message = WHAT (3 words max) + WHY (4 words max), so it is never over 7 words.
export const FAIL = {
  login: 'Login failed.',
  register: 'Account not created.',
  profile: 'Profile not saved.',
  picture: 'Picture not uploaded.',
  apartmentSave: 'Apartment not saved.',
  apartmentDelete: 'Apartment not deleted.',
  apartmentLoad: 'Apartment not loaded.',
  apartmentsLoad: 'Apartments not loaded.',
  tenantSave: 'Tenant not saved.',
  tenantRemove: 'Tenant not removed.',
  tenantLoad: 'Tenant not loaded.',
  tenantsLoad: 'Tenants not loaded.',
  documents: 'Documents not uploaded.',
  dashboard: 'Dashboard not loaded.',
  form: 'Form not loaded.',
};

// WHY it failed, picked from the network error or the HTTP status.
export const CAUSE = {
  offline: 'Server unreachable.',
  timeout: 'Request timed out.',
  session: 'Session expired.',
  forbidden: 'Permission denied.',
  missing: 'Record not found.',
  conflict: 'Conflicts with existing data.',
  tooLarge: 'File too large.',
  badType: 'Unsupported file type.',
  invalid: 'Invalid details submitted.',
  busy: 'Too many requests.',
  server: 'Server error.',
  unknown: 'Please try again.',
};

// Messages that stand on their own.
export const ERR = {
  loginWrong: 'Incorrect email or password.',
  sessionExpired: 'Session expired. Please log in.',
  offline: 'You are offline.',
  offlineBanner: "You are offline. Changes won't save.",
  crashed: 'Something broke. Please reload.',
  notFoundPage: 'Page not found.',
  tenantGone: 'This tenant no longer exists.',
  apartmentGone: 'This apartment no longer exists.',
  fixFields: 'Please fix the highlighted fields.',
  docsFailed: 'Documents failed to upload.',
  invalidValue: 'Invalid value entered.',
};

export const OK = {
  welcome: (name) => (name ? `Welcome back, ${name}!` : 'You are now logged in.'),
  registered: 'Account created. Please log in.',
  accountReady: 'Account created successfully.',
  loggedOut: 'You have been logged out.',
  backOnline: 'You are back online.',
  tenantAdded: 'Tenant added successfully.',
  tenantAddedDocs: 'Tenant and documents saved.',
  tenantUpdated: 'Tenant updated successfully.',
  tenantRemoved: 'Tenant removed successfully.',
  docsUploaded: 'Documents uploaded successfully.',
  apartmentAdded: 'Apartment added successfully.',
  apartmentUpdated: 'Apartment updated successfully.',
  apartmentDeleted: 'Apartment deleted successfully.',
  profileSaved: 'Profile updated successfully.',
};

// Neutral notices.
export const NOTE = {
  waking: 'Server is waking up. Please wait.',
  slow: 'Still working. Thanks for waiting.',
};

// Messages shown under form fields.
export const V = {
  required: (label) => (countWords(label) <= 4 ? `${label} is required.` : 'This field is required.'),
  select: (label) => (countWords(label) <= 4 ? `Please select ${label}.` : 'Please select an option.'),
  choose: 'Please choose an option.',
  email: 'Enter a valid email address.',
  validOption: 'Choose a valid option.',
  validValue: 'Enter a valid value.',
  lengthWrong: 'Value length is not allowed.',
  min0: 'Must be 0 or more.',
  occupants: 'At least one occupant required.',
  futureDate: "Date can't be in the future.",
  passwordShort: 'Use at least 8 characters.',
  passwordLong: 'Use 64 characters or fewer.',
  passwordWeak: 'Include letters and at least one number.',
  nameInvalid: 'Use letters only, no numbers.',
  nameShort: 'Enter at least 2 letters.',
  fullName: 'Enter first and last name.',
  tooLong: 'Text is too long.',
  phone: 'Enter a valid phone number.',
  ownNumber: "Use someone else's number.",
  ownName: 'Use someone other than the tenant.',
  contact: 'Enter a phone number or email.',
  addressInvalid: 'Enter a complete valid address.',
  textInvalid: 'Contains unsupported characters.',
  reason: 'Enter a short valid reason.',
  duration: 'Include a number, like 2 years.',
  money: 'Enter an amount above zero.',
  moneyMax: 'Amount is unrealistically large.',
  moneyDecimals: 'Use at most 2 decimal places.',
  wholeNumber: 'Enter a whole number.',
  occupantsMax: 'Maximum of 20 occupants.',
  dateInvalid: 'Enter a valid date.',
  under18: 'Tenant must be 18 or older.',
  tooOld: 'Enter a realistic date of birth.',
  dateRecent: 'Use a date within 30 days.',
  idNumber: 'Use 6 to 20 letters or digits.',
  nin: 'National ID must be 11 digits.',
  signatureMatch: 'Signature must match full name.',
  apartmentNo: 'Use letters, digits, dash or slash.',
  passwordMismatch: 'Passwords do not match.',
  declaration: 'Please confirm the declaration.',
  fileImage: 'Only JPG, PNG or WebP.',
  fileDocument: 'Only images or PDFs allowed.',
  fileSize: (mb) => `File exceeds the ${mb} MB limit.`,
};

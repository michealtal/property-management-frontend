// ---------------------------------------------------------------------------------------------
// EDIT THIS FILE when the backend developer confirms the exact upload routes and file names.
// The API guide only says "PATCH /api/tenants/:id/..." for tenant uploads, so these are best guesses.
// ---------------------------------------------------------------------------------------------

// Each group is one PATCH request to /api/tenants/:id/<path> with multipart/form-data.
//   files: { <name used in this app>: <field name the server expects> }
// If photos and documents have separate routes, list two groups, for example:
//   { path: 'passport', files: { passportPhoto: 'passport' } },
//   { path: 'documents', files: { idDocument: 'idDocument', workId: 'workId' } },
export const TENANT_UPLOAD_GROUPS = [
  { path: 'documents', files: { passportPhoto: 'passportPhoto', idDocument: 'idDocument', workId: 'workId' } },
];

// Where a tenant response may hold the link to each uploaded file. The first one found is used.
export const DOC_URL_PATHS = {
  passportPhoto: ['passportPhoto', 'photo', 'documents.passportPhoto', 'identification.passportPhoto'],
  idDocument: ['idDocument', 'documents.idDocument', 'identification.idDocument', 'identification.document'],
  workId: ['workId', 'documents.workId', 'identification.workId'],
};

import { api } from '../lib/api';
import { TENANT_UPLOAD_GROUPS } from '../lib/uploadConfig';
import { asArray, unwrap } from '../lib/unwrap';

const normalize = (t) => ({ ...t, id: t?._id ?? t?.id ?? t?.tenantId });
const one = (body) => normalize(unwrap(body, ['tenant']));

export const tenantsApi = {
  list: () => api.get('/tenants').then((r) => asArray(unwrap(r.data, ['tenants'])).map(normalize)),
  get: (id) => api.get(`/tenants/${id}`).then((r) => one(r.data)),

  // Request 1: the details, as JSON, shaped like the API guide (personalInformation: {...}, ...).
  create: (data) =>
    api.post('/tenants', data).then((r) => {
      const tenant = one(r.data);
      if (!tenant.id) throw new Error('The server did not return the new tenant id.');
      return tenant;
    }),
  update: (id, data) => api.patch(`/tenants/${id}`, data).then((r) => ({ ...one(r.data), id })),

  // Request 2: the files, as multipart/form-data, one PATCH per group in uploadConfig.js.
  // `files` looks like { passportPhoto: File, idDocument: File, workId: File }.
  // `onProgress` receives 0 to 100. If a group fails, the error carries `.remaining`: the files
  // that were not uploaded yet, so a retry sends only those.
  uploadDocuments: async (id, files, onProgress) => {
    const remaining = { ...files };
    const groups = TENANT_UPLOAD_GROUPS.filter((g) => Object.keys(g.files).some((name) => remaining[name]));

    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i];
      const body = new FormData();
      Object.entries(group.files).forEach(([name, field]) => remaining[name] && body.append(field, remaining[name]));
      try {
        await api.patch(`/tenants/${id}/${group.path}`, body, {
          timeout: 120000,
          onUploadProgress: (event) => {
            if (onProgress && event.total) {
              onProgress(Math.round(((i + event.loaded / event.total) / groups.length) * 100));
            }
          },
        });
      } catch (error) {
        error.remaining = remaining;
        throw error;
      }
      Object.keys(group.files).forEach((name) => delete remaining[name]);
    }
    onProgress?.(100);
  },

  remove: (id) => api.delete(`/tenants/${id}`).then((r) => r.data),
};

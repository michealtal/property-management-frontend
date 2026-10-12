import { api } from '../lib/api';
import { fileUrl } from '../lib/tenant';
import { unwrap } from '../lib/unwrap';

// The picture link may sit under a different name, or be an object like { url } from Cloudinary.
const PICTURE_KEYS = ['profilePicture', 'profileImage', 'profilePic', 'avatar', 'picture', 'image', 'photo'];

export function pictureOf(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of PICTURE_KEYS) {
    const url = fileUrl(obj[key]);
    if (url) return url;
  }
  return '';
}

const normalizeUser = (u) => ({ ...u, id: u?._id ?? u?.id, profilePicture: pictureOf(u) });

// Keep what the new copy knows, but never wipe a field because the server left it out.
export function mergeUser(previous, next) {
  const out = { ...previous };
  Object.entries(next || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  });
  return out;
}

// Login and register answer with a token and the user, in whichever shape the server uses.
function readSession(body) {
  const token = body?.token ?? body?.accessToken ?? body?.data?.token ?? null;
  const raw = body?.user ?? body?.data?.user ?? (body?.data && typeof body.data === 'object' ? body.data : body);
  const { token: _t, accessToken: _a, password: _p, ...user } = raw || {};
  return { token, user: normalizeUser(user) };
}

const bearer = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

export const authApi = {
  login: ({ email, password }) => api.post('/users/login', { email, password }).then((r) => readSession(r.data)),

  // The server wants confirmPassword too. The profile picture is a separate request (uploadPicture).
  register: (fields) => api.post('/users/register', fields).then((r) => readSession(r.data)),

  // Send only what changed. Needs the user's id, which comes from login.
  update: (id, changes) =>
    api.patch(`/users/${id}`, changes).then((r) => normalizeUser(unwrap(r.data, ['user']) || {})),

  // multipart/form-data. `token` is only needed during registration, before login is stored.
  // Returns the new picture link. It looks in the upload response first, then asks the server for the user.
  uploadPicture: async (file, { token, id } = {}) => {
    const body = new FormData();
    body.append('profilePicture', file);
    const { data } = await api.patch('/users/profile-picture', body, { timeout: 120000, ...bearer(token) });

    let link =
      pictureOf(unwrap(data, ['user'])) || pictureOf(data) || fileUrl(data?.url ?? data?.imageUrl ?? data?.secure_url);
    if (!link && id) link = await authApi.get(id, token).then((u) => u.profilePicture).catch(() => '');
    if (import.meta.env.DEV && !link) console.warn('Picture uploaded, but no picture link was found in the response:', data);
    return link;
  },

  get: (id, token) =>
    api.get(`/users/${id}`, bearer(token)).then((r) => normalizeUser(unwrap(r.data, ['user']) || {})),
};

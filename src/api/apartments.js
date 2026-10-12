import { api } from '../lib/api';
import { asArray, unwrap } from '../lib/unwrap';

// The server calls the id `_id` and writes status in lowercase. The app uses `id` and "Vacant" / "Occupied".
const capStatus = (s) => (String(s || '').toLowerCase() === 'occupied' ? 'Occupied' : 'Vacant');
const normalize = (a) => ({ ...a, id: a?._id ?? a?.id, status: capStatus(a?.status) });

const toApi = ({ apartmentNumber, address, type, status }) => ({
  apartmentNumber,
  address,
  type,
  status: capStatus(status).toLowerCase(),
});

export const apartmentsApi = {
  list: () => api.get('/apartments').then((r) => asArray(unwrap(r.data, ['apartments'])).map(normalize)),
  get: (id) => api.get(`/apartments/${id}`).then((r) => normalize(unwrap(r.data, ['apartment']))),
  create: (data) => api.post('/apartments', toApi(data)).then((r) => normalize(unwrap(r.data, ['apartment']))),
  update: (id, data) =>
    api.patch(`/apartments/${id}`, toApi(data)).then((r) => normalize(unwrap(r.data, ['apartment']))),
  remove: (id) => api.delete(`/apartments/${id}`).then((r) => r.data),
};

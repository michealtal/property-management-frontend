// The server may answer with the data itself, or wrapped: { data: ... }, { apartments: [...] },
// { status: "success", data: { apartments: [...] } }. unwrap() finds the payload in any of these.
export function unwrap(body, keys = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const pick = (obj) => {
    for (const key of keys) if (obj[key] !== undefined) return obj[key];
    return undefined;
  };
  const direct = pick(body);
  if (direct !== undefined) return direct;
  if (body.data && typeof body.data === 'object') {
    if (Array.isArray(body.data)) return body.data;
    const inner = pick(body.data);
    return inner !== undefined ? inner : body.data;
  }
  return body;
}

// A list, wherever the server put it.
export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  return Object.values(value).find(Array.isArray) || [];
}

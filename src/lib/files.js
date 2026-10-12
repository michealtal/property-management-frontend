import { V } from './messages';

export const MAX_FILE_MB = 5;

const IMAGES = ['image/jpeg', 'image/png', 'image/webp'];

export const FILE_KINDS = {
  image: {
    accept: IMAGES.join(','),
    types: IMAGES,
    hint: 'JPG, PNG or WebP',
    typeError: V.fileImage,
  },
  document: {
    accept: [...IMAGES, 'application/pdf'].join(','),
    types: [...IMAGES, 'application/pdf'],
    hint: 'JPG, PNG, WebP or PDF',
    typeError: V.fileDocument,
  },
};

// Returns true when the file is fine, or a short message when it is not.
export function checkFile(file, kind = 'document') {
  if (!file) return true;
  const rules = FILE_KINDS[kind];
  if (!rules.types.includes(file.type)) return rules.typeError;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return V.fileSize(MAX_FILE_MB);
  return true;
}

export function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

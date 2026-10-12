// Cloudinary can resize an image on its own servers if the link says so. A 36 px avatar then downloads
// a few KB instead of the original multi-megabyte photo. Links from other hosts are returned unchanged.
const MARKER = '/image/upload/';

function insertTransform(url, transform) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;
  const at = url.indexOf(MARKER);
  if (at < 0) return url;
  const cut = at + MARKER.length;
  return `${url.slice(0, cut)}${transform}/${url.slice(cut)}`;
}

// A square crop on the face, sized for avatars. `px` is the size on screen; we ask for double for sharp screens.
export const thumbUrl = (url, px) => insertTransform(url, `w_${px * 2},h_${px * 2},c_fill,g_auto,f_auto,q_auto`);

// A preview for document tiles: at most 600 px wide, original shape.
export const previewUrl = (url) => insertTransform(url, 'w_600,c_limit,f_auto,q_auto');

// A copy at most `px` wide, for the PDF report.
export const sizedUrl = (url, px) => insertTransform(url, `w_${px},c_limit,q_auto`);

// Phone photos are often 4 to 8 MB. Shrink them in the browser before upload: faster on a weak connection,
// and under the 5 MB limit. Small images, PDFs and anything we cannot read are left exactly as they are.
export async function shrinkImage(file, { maxSide = 1600, quality = 0.85, skipBelow = 700 * 1024 } = {}) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= skipBelow) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // transparent PNGs become white, not black, as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.\w+$/, '')}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

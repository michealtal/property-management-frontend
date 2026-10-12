import { sizedUrl } from './image';

// Draws a report (see report.js) as a PDF and saves it. The PDF library and the fonts are only
// downloaded when the button is pressed, so they do not slow the rest of the app.
// The font is Noto Sans (subset): it has the letters used in Yoruba, Igbo and Hausa names and the naira sign.

const BASE = import.meta.env.BASE_URL || '/';
const NAVY = [24, 39, 66];
const BRAND = [47, 75, 208];
const GREY = [100, 112, 133];
const INK = [16, 28, 51];
const LINE = [223, 228, 237];

async function fontBase64(file) {
  const buffer = await (await fetch(`${BASE}fonts/${file}`)).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// A picture as a JPEG the PDF can hold. Returns null for anything that cannot be read (a PDF file, a blocked link).
async function loadImage(url, maxSide = 900) {
  if (!url) return null;
  try {
    const response = await fetch(sizedUrl(url, maxSide), { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return { data: canvas.toDataURL('image/jpeg', 0.85), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

export async function downloadReport(report) {
  const [{ jsPDF }, regular, bold, photo, docImages] = await Promise.all([
    import('jspdf'),
    fontBase64('NotoSans-Regular.ttf'),
    fontBase64('NotoSans-Bold.ttf'),
    loadImage(report.photo, 500),
    Promise.all(report.docs.map((d) => loadImage(d.url))),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('NotoSans-Regular.ttf', regular);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', bold);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setProperties({ title: report.title, subject: report.subtitle, creator: 'House Management' });

  const W = 210;
  const H = 297;
  const M = 16;
  const COL = (W - 2 * M - 8) / 2;
  let y = 0;

  const font = (style, size, color) => {
    doc.setFont('NotoSans', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const room = (needed) => {
    if (y + needed > H - 18) {
      doc.addPage();
      y = M;
    }
  };

  // ----- header band -----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 40, 'F');
  doc.setFillColor(247, 207, 102);
  doc.rect(0, 40, W, 1.2, 'F');
  const textWidth = photo ? W - 2 * M - 34 : W - 2 * M;
  font('bold', 20, [255, 255, 255]);
  doc.text(doc.splitTextToSize(report.title, textWidth).slice(0, 2), M, 17);
  font('normal', 10.5, [203, 213, 225]);
  doc.text(doc.splitTextToSize(report.subtitle || '', textWidth).slice(0, 2), M, 29);
  if (photo) {
    const size = 28;
    doc.addImage(photo.data, 'JPEG', W - M - size, 6, size, size);
  }
  y = 52;

  // ----- sections -----
  report.sections.forEach((section) => {
    room(24);
    font('bold', 12, BRAND);
    doc.text(section.title, M, y);
    doc.setDrawColor(...LINE);
    doc.line(M, y + 2, W - M, y + 2);
    y += 9;

    for (let i = 0; i < section.rows.length; i += 2) {
      const cells = section.rows.slice(i, i + 2).map(([label, value]) => {
        font('normal', 10, INK);
        return { label, lines: doc.splitTextToSize(String(value), COL) };
      });
      const lines = Math.max(...cells.map((c) => c.lines.length));
      const height = 4.5 + lines * 4.8 + 3;
      room(height);
      cells.forEach((cell, c) => {
        const x = M + c * (COL + 8);
        font('normal', 8, GREY);
        doc.text(cell.label, x, y);
        font('normal', 10, INK);
        doc.text(cell.lines, x, y + 4.8);
      });
      y += height;
    }
    y += 4;
  });

  // ----- documents -----
  if (report.docs.length) {
    room(30);
    font('bold', 12, BRAND);
    doc.text('Documents', M, y);
    doc.setDrawColor(...LINE);
    doc.line(M, y + 2, W - M, y + 2);
    y += 9;

    report.docs.forEach((d, i) => {
      const img = docImages[i];
      const maxW = 90;
      const maxH = 62;
      const scale = img ? Math.min(maxW / img.w, maxH / img.h) : 0;
      room(img ? maxH + 14 : 14);
      font('bold', 10, INK);
      doc.text(d.label, M, y);
      if (!d.url) {
        font('normal', 9, GREY);
        doc.text('Not uploaded', M, y + 5);
        y += 12;
        return;
      }
      if (img) {
        const w = img.w * scale;
        const h = img.h * scale;
        doc.setDrawColor(...LINE);
        doc.rect(M, y + 3, w, h);
        doc.addImage(img.data, 'JPEG', M, y + 3, w, h);
        y += h + 6;
      } else {
        y += 5;
      }
      font('normal', 8.5, BRAND);
      doc.textWithLink('Open original file', M, y, { url: d.url });
      y += 8;
    });
  }

  // ----- footer on every page -----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.line(M, H - 13, W - M, H - 13);
    font('normal', 8, GREY);
    doc.text(`House Management · Confidential · Generated ${report.date}`, M, H - 8);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: 'right' });
  }

  doc.save(`${report.filename}.pdf`);
}

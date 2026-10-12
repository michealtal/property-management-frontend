import { useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { toast } from '../store/toast';
import { Button } from './ui';

// The printable page. It is hidden on screen and is the only thing drawn when printing (see index.css).
function Sheet({ report }) {
  return createPortal(
    <div id="print-root">
      <header className="sheet-head">
        <div>
          <h1>{report.title}</h1>
          {report.subtitle && <p>{report.subtitle}</p>}
        </div>
        {report.photo && <img src={report.photo} alt="" className="sheet-photo" />}
      </header>
      {report.sections.map((section) => (
        <section key={section.title} className="sheet-section">
          <h2>{section.title}</h2>
          <dl>
            {section.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {report.docs.length > 0 && (
        <section className="sheet-section">
          <h2>Documents</h2>
          <div className="sheet-docs">
            {report.docs.map((d) => (
              <figure key={d.label}>
                <figcaption>{d.label}</figcaption>
                {d.url ? <img src={d.url} alt="" onError={(e) => e.currentTarget.replaceWith(Object.assign(document.createElement('small'), { textContent: d.url }))} /> : <small>Not uploaded</small>}
              </figure>
            ))}
          </div>
        </section>
      )}
      <footer className="sheet-foot">House Management · Confidential · Generated {report.date}</footer>
    </div>,
    document.body
  );
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

// Waits (at most 5 seconds) for the pictures on the page, so a printout is never missing a photo.
async function picturesReady() {
  const pending = [...document.querySelectorAll('#print-root img')]
    .filter((img) => !img.complete)
    .map((img) => new Promise((resolve) => { img.onload = img.onerror = resolve; }));
  await Promise.race([Promise.all(pending), new Promise((resolve) => setTimeout(resolve, 5000))]);
}

// Print and Download buttons. `build` returns the report (it may fetch fresh data first).
export default function ReportActions({ build }) {
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(null); // null | 'print' | 'pdf'

  async function print() {
    if (busy) return;
    setBusy('print');
    try {
      const data = await build();
      flushSync(() => setReport(data));
      await nextFrame();
      await picturesReady();
      const old = document.title;
      document.title = data.filename; // the name suggested when saving the printout as a PDF
      const restore = () => {
        document.title = old;
        window.removeEventListener('afterprint', restore);
      };
      window.addEventListener('afterprint', restore);
      window.print();
    } catch {
      toast.error('Could not prepare printout.');
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    if (busy) return;
    setBusy('pdf');
    try {
      const data = await build();
      const { downloadReport } = await import('../lib/pdf');
      await downloadReport(data);
    } catch {
      toast.error('Could not create the PDF.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button variant="secondary" icon="printer" loading={busy === 'print'} onClick={print}>
        Print
      </Button>
      <Button variant="secondary" icon="download" loading={busy === 'pdf'} onClick={download}>
        Download PDF
      </Button>
      {report && <Sheet report={report} />}
    </>
  );
}

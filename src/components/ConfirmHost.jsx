import { useEffect, useRef } from 'react';
import { useConfirmStore } from '../store/confirm';
import Icon from './Icon';
import { btn, btn2, btnDanger } from './ui';

// The pop-up behind confirm({...}). It uses the browser's own <dialog>, so focus stays inside it
// and Escape closes it.
export default function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const answer = useConfirmStore((s) => s.answer);
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (request && dialog && !dialog.open) dialog.showModal();
  }, [request]);

  if (!request) return null;
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = request;

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        answer(false);
      }}
      onClick={(e) => e.target === e.currentTarget && answer(false)}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,26rem)] animate-dialog-in rounded-xl bg-white p-0 shadow-float backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <span
          className={`mb-4 grid h-11 w-11 place-items-center rounded-full ${
            danger ? 'bg-bad-50 text-bad-600' : 'bg-brand-50 text-brand-600'
          }`}
        >
          <Icon name={danger ? 'trash' : 'info'} className="h-5 w-5" />
        </span>
        <h2 id="confirm-title" className="text-lg font-bold text-ink-900">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">{message}</p>
      </div>
      <div className="flex justify-end gap-2 rounded-b-xl border-t border-line bg-slate-50 px-6 py-4">
        <button autoFocus className={btn2} onClick={() => answer(false)}>
          {cancelLabel}
        </button>
        <button className={danger ? btnDanger : btn} onClick={() => answer(true)}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

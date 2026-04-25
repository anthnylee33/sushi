import { useToast, type ToastTone } from '../state/ToastContext';

const toneClasses: Record<ToastTone, string> = {
  info: 'bg-slate-900 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-white',
};

export function ToastHost() {
  const { toasts, dismissToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={`pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-left text-sm font-semibold shadow-lg ring-1 ring-black/5 transition ${toneClasses[t.tone]}`}
          aria-label={`Dismiss notification: ${t.message}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

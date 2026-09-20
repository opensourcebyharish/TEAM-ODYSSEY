import type { Dispatch, SetStateAction } from 'react';

export interface ToastItem {
  id: number;
  severity: string;
  message: string;
}

export function pushToast(
  setToasts: Dispatch<SetStateAction<ToastItem[]>>,
  toast: ToastItem
) {
  setToasts((t) => [...t.slice(-4), toast]);
  window.setTimeout(() => {
    setToasts((t) => t.filter((x) => x.id !== toast.id));
  }, 7000);
}

const severityStyle: Record<string, string> = {
  info: 'border-cyan-500/50 bg-abyss-800/95 text-cyan-300',
  warning: 'border-amber-500/50 bg-abyss-800/95 text-amber-300',
  critical: 'border-red-500/60 bg-abyss-800/95 text-red-300',
};

const severityIcon: Record<string, string> = {
  info: '🟢',
  warning: '⚠️',
  critical: '🔴',
};

export default function ToastHost({
  toasts,
  setToasts,
}: {
  toasts: ToastItem[];
  setToasts: Dispatch<SetStateAction<ToastItem[]>>;
}) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[2000] flex w-96 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-2xl backdrop-blur-md animate-fade-in ${severityStyle[t.severity] || severityStyle.info}`}
        >
          <span className="text-base leading-none">{severityIcon[t.severity] || 'ℹ️'}</span>
          <p className="flex-1 leading-snug">{t.message}</p>
          <button
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            className="text-slate-400 hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
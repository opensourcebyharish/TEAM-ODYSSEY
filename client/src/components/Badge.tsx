import type { ReactNode } from 'react';

const tones: Record<string, string> = {
  ok: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  crit: 'bg-red-500/10 text-red-300 border-red-500/30',
  info: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  off: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  teal: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
};

export default function Badge({
  tone = 'info',
  children,
}: {
  tone?: keyof typeof tones | string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tones[tone] || tones.info}`}
    >
      {children}
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: string }) {
  const colorMap: Record<string, string> = {
    IDLE: 'off', DIVE: 'info', DRIFT: 'teal', SENSE: 'ok', DECIDE: 'warn',
    SURFACE: 'info', TRANSMIT: 'teal', PAUSED: 'warn',
  };
  return <Badge tone={colorMap[phase] || 'info'}>{phase}</Badge>;
}

export function MissionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    running: { tone: 'ok', label: 'RUNNING' },
    paused: { tone: 'warn', label: 'PAUSED' },
    idle: { tone: 'off', label: 'IDLE' },
    completed: { tone: 'teal', label: 'COMPLETED' },
    aborted: { tone: 'crit', label: 'ABORTED' },
  };
  const m = map[status.toLowerCase()] || { tone: 'off', label: status.toUpperCase() };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

const dot: Record<string, string> = {
  ok: 'bg-status-ok',
  warn: 'bg-status-warn',
  crit: 'bg-status-crit',
  off: 'bg-status-off',
};

export function Dot({ tone = 'ok', pulse = false }: { tone?: string; pulse?: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${dot[tone] || dot.ok} ${pulse ? 'animate-pulse-slow' : ''}`} />;
}
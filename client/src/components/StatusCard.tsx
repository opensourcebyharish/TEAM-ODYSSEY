import type { ReactNode } from 'react';

type Tone = 'ok' | 'warn' | 'crit' | 'off';

const toneDot: Record<Tone, string> = {
  ok: 'bg-status-ok',
  warn: 'bg-status-warn',
  crit: 'bg-status-crit',
  off: 'bg-status-off',
};

const toneRing: Record<Tone, string> = {
  ok: 'text-status-ok',
  warn: 'text-status-warn',
  crit: 'text-status-crit',
  off: 'text-status-off',
};

export default function StatusCard({
  label,
  icon,
  value,
  unit,
  sub,
  tone = 'ok',
  spark,
}: {
  label: string;
  icon: string;
  value: string | number;
  unit?: string;
  sub?: string;
  tone?: Tone;
  spark?: ReactNode;
}) {
  return (
    <div className="card group relative overflow-hidden p-4 transition-colors hover:border-teal-500/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          <span className="text-base">{icon}</span>
          {label}
        </div>
        <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${toneDot[tone]} animate-pulse-slow`} />
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`data-value text-3xl font-bold ${toneRing[tone]}`}>{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
      {spark && <div className="mt-2 h-10">{spark}</div>}
    </div>
  );
}
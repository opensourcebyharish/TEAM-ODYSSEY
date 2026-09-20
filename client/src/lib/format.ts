export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour12: false });
}

export function fmtTemp(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${v.toFixed(1)} °C`;
}

export function fmtPressure(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${Math.round(v)} hPa`;
}

export function fmtDepth(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${v.toFixed(1)} m`;
}

export function fmtPct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${Math.round(v)} %`;
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'now';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Compact UTC clock override for the header. */
export function utcClock(): string {
  return new Date().toISOString().slice(11, 19);
}
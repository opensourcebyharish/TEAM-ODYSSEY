import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import { sensorsApi } from '../lib/api';
import type { SensorReading } from '../lib/types';
import { fmtDateTime } from '../lib/format';

type SortKey = 'timestamp' | 'temperature' | 'pressure' | 'depth' | 'battery';
const PAGE_SIZE = 25;

export default function HistoricalPage() {
  const [rows, setRows] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const source = axios.CancelToken.source();
    setLoading(true);
    sensorsApi.history({ limit: 1500, from: undefined, to: undefined })
      .then((r) => setRows(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => source.cancel();
  }, []);

  const filtered = useMemo(() => {
    let out = rows;
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) =>
        r.timestamp.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q) ||
        r.device_id.toLowerCase().includes(q) ||
        String(r.mission_id ?? '').includes(q)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  useEffect(() => { setPage(1); }, [query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-teal-300">
      {label}
      <span className="text-[9px]">{sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </button>
  );

  return (
    <div>
      <PageHeader title="Historical Data" subtitle="Every measurement, stored onboard and synced to Mission Control">
        <Badge tone="info">{rows.length.toLocaleString()} records</Badge>
      </PageHeader>

      <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <input
          className="input w-full max-w-xs"
          placeholder="Search timestamp, status, device, mission…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="text-xs text-slate-500">
          Showing <span className="data-value text-slate-200">{pageRows.length}</span> of{' '}
          <span className="data-value text-slate-200">{filtered.length.toLocaleString()}</span> · page{' '}
          <span className="data-value text-slate-200">{page}</span>/{totalPages}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-abyss-600/40 bg-abyss-900/70 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3"><SortBtn k="timestamp" label="Timestamp" /></th>
                <th className="px-4 py-3"><SortBtn k="temperature" label="Temp" /></th>
                <th className="px-4 py-3"><SortBtn k="pressure" label="Pressure" /></th>
                <th className="px-4 py-3"><SortBtn k="depth" label="Depth" /></th>
                <th className="px-4 py-3">Accel Z</th>
                <th className="px-4 py-3">Gyro Z</th>
                <th className="px-4 py-3"><SortBtn k="battery" label="Batt" /></th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Mission</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No records match.</td></tr>
              ) : pageRows.map((r) => (
                <tr key={r.id} className="border-b border-abyss-700/30 text-xs transition-colors hover:bg-abyss-800/40">
                  <td className="data-value whitespace-nowrap px-4 py-2.5 text-slate-300">{fmtDateTime(r.timestamp)}</td>
                  <td className="data-value px-4 py-2.5 text-teal-300">{r.temperature?.toFixed(2) ?? '—'} °C</td>
                  <td className="data-value px-4 py-2.5 text-cyan-300">{r.pressure != null ? Math.round(r.pressure) : '—'} hPa</td>
                  <td className="data-value px-4 py-2.5 text-slate-200">{r.depth?.toFixed(1) ?? '—'} m</td>
                  <td className="data-value px-4 py-2.5 text-slate-400">{r.accel_z?.toFixed(2) ?? '—'}</td>
                  <td className="data-value px-4 py-2.5 text-slate-400">{r.gyro_z?.toFixed(1) ?? '—'}</td>
                  <td className="data-value px-4 py-2.5">{r.battery != null
                    ? <span className={r.battery <= 15 ? 'text-red-400' : r.battery <= 30 ? 'text-amber-300' : 'text-emerald-300'}>{Math.round(r.battery)}%</span>
                    : '—'}</td>
                  <td className="px-4 py-2.5"><Badge tone={r.status === 'SURFACE' ? 'info' : r.status === 'SENSE' ? 'ok' : r.status === 'DIVE' ? 'teal' : 'off'}>{r.status || '—'}</Badge></td>
                  <td className="data-value px-4 py-2.5 text-slate-500">{r.mission_id ? `M${String(r.mission_id).padStart(2, '0')}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <button className="btn-ghost px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`h-8 w-8 rounded-lg text-xs ${page === i + 1 ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'border border-abyss-600 text-slate-400 hover:text-white'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button className="btn-ghost px-3 py-1.5 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
      </div>
    </div>
  );
}
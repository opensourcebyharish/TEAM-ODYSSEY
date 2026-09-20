import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Badge, { Dot } from '../components/Badge';
import { exportApi, deviceApi } from '../lib/api';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import type { CommStatus } from '../lib/types';
import { fmtRelative } from '../lib/format';

export default function DataExportPage() {
  const { can } = useAuth();
  const [meta, setMeta] = useState<{ readings: number; devices: number; earliest: string; latest: string } | null>(null);
  const [comm, setComm] = useState<CommStatus | null>(null);
  const [limit, setLimit] = useState(10000);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [pending, setPending] = useState<any[]>([]);
  const canExport = can('admin', 'researcher', 'operator');

  useEffect(() => {
    exportApi.meta().then((r) => setMeta(r.data)).catch(() => {});
    deviceApi.comm().then((r) => setComm(r.data)).catch(() => {});
    api.get('/data/export/pending').then((r) => setPending(r.data)).catch(() => {});
  }, []);

  function download() {
    if (!canExport) return;
    if (format === 'csv') {
      const url = exportApi.csvUrl({ limit });
      const a = document.createElement('a');
      a.href = url;
      a.download = `odyssey-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      const url = exportApi.jsonUrl({ limit });
      const a = document.createElement('a');
      a.href = url;
      a.download = `odyssey-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  return (
    <div>
      <PageHeader title="Data Export" subtitle="Download sensor history in open formats for research analysis">
        <Badge tone="info"><Dot tone="info" /> PUBLIC FORMATS</Badge>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Export controls */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Export Dataset</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Format</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormat('csv')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${format === 'csv' ? 'border-teal-500/60 bg-teal-500/10 text-teal-300' : 'border-abyss-600 text-slate-400'}`}
                >
                  📋 CSV
                </button>
                <button
                  onClick={() => setFormat('json')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${format === 'json' ? 'border-teal-500/60 bg-teal-500/10 text-teal-300' : 'border-abyss-600 text-slate-400'}`}
                >
                  🧾 JSON
                </button>
              </div>
            </div>
            <div>
              <label className="label">Record limit</label>
              <select className="input w-full" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={1000}>1,000 rows</option>
                <option value={5000}>5,000 rows</option>
                <option value={10000}>10,000 rows</option>
                <option value={50000}>50,000 rows</option>
              </select>
            </div>
          </div>

          {/* Dataset info */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Readings', meta?.readings?.toLocaleString() ?? '—'],
              ['Devices', meta?.devices ?? '—'],
              ['Earliest', meta?.earliest ? fmtRelative(meta.earliest) : '—'],
              ['Latest', meta?.latest ? fmtRelative(meta.latest) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-abyss-900/60 p-3">
                <div className="text-[10px] uppercase text-slate-500">{label}</div>
                <div className="data-value mt-1 text-sm font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>

          <button className="btn-primary mt-5" onClick={download} disabled={!canExport}>
            ⬇ DOWNLOAD {format.toUpperCase()}
          </button>

          {!canExport && (
            <p className="mt-3 text-xs text-amber-400">Viewer role cannot export. Contact an admin or researcher.</p>
          )}

          <div className="mt-4 rounded-lg border border-abyss-600/40 bg-abyss-900/50 p-3 text-[11px] leading-relaxed text-slate-500">
            <strong className="text-slate-300">Columns:</strong> id, timestamp, temperature, pressure, depth,
            accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, battery, status, mission_id.
            Files are served directly from the Mission Control API and include the full history up to the selected limit.
          </div>
        </div>

        {/* Sync card */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Data Synchronization</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Link status</span>
                <Badge tone={comm?.online ? 'ok' : 'crit'}>{comm?.online ? 'ONLINE' : 'OFFLINE'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last sync</span>
                <span className="data-value text-slate-200">{comm ? fmtRelative(comm.last_sync) : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pending records</span>
                <span className="data-value text-slate-200">{comm?.pending_records ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Auto-sync</span>
                <Badge tone={comm?.auto_sync ? 'ok' : 'off'}>{comm?.auto_sync ? 'ENABLED' : 'DISABLED'}</Badge>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-abyss-700/60">
              <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" style={{ width: '100%' }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Onboard MicroSD captures are buffered during link loss and re-uploaded automatically when Wi-Fi returns.
            </p>
          </div>

          {/* Pending buffer */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Pending Buffer</h3>
            <div className="mt-3 text-xs text-slate-500">
              {pending.length
                ? `${pending.length} buffered record(s) ready to sync when the link is available.`
                : 'No buffered records — all data synced. The simulator occasionally buffers & flushes to demo the offline path.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
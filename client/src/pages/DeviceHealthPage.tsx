import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Badge, { Dot } from '../components/Badge';
import { deviceApi } from '../lib/api';
import { onLive } from '../lib/socket';
import { fmtRelative } from '../lib/format';
import type { CommStatus, Device, DeviceHealth } from '../lib/types';

const toneFor = (status: string) =>
  /online|normal|ok|free/.test(status.toLowerCase()) ? 'ok'
  : /warn|low|weak/.test(status.toLowerCase()) ? 'warn'
  : /crit|error|fail|offline|ingress/.test(status.toLowerCase()) ? 'crit'
  : 'info';

const componentIcon: Record<string, string> = {
  STM32: '🧠', ESP8266: '📶', DS18B20: '🌡️', BMP180: '🌀', MPU6050: '📈',
  DS1307: '🕐', MicroSD: '💾', Battery: '🔋', Memory: '🧮',
};

export default function DeviceHealthPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [health, setHealth] = useState<DeviceHealth[]>([]);
  const [comm, setComm] = useState<CommStatus | null>(null);

  function refresh() {
    deviceApi.status().then((r) => setDevices(r.data)).catch(() => {});
    deviceApi.health().then((r) => setHealth(r.data)).catch(() => {});
    deviceApi.comm().then((r) => setComm(r.data)).catch(() => {});
  }

  useEffect(() => {
    refresh();
    // Health can update over the wire too
    const off = onLive('device:health', (h) => setHealth(h));
    return off;
  }, []);

  const onlineDevices = devices.filter((d) => d.status === 'online').length;

  return (
    <div>
      <PageHeader title="Device Health" subtitle="Fleet and component status — simplifies troubleshooting">
        <Badge tone="ok">{onlineDevices}/{devices.length} devices online</Badge>
      </PageHeader>

      {/* Device fleet */}
      <div className="grid gap-4 md:grid-cols-2">
        {devices.map((d) => (
          <div key={d.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Dot tone={toneFor(d.status)} pulse /> {d.device_name}
                </div>
                <div className="data-value mt-0.5 text-[11px] text-slate-500">{d.device_id} · FW {d.firmware_version}</div>
              </div>
              <Badge tone={toneFor(d.status)}>{d.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between rounded-lg bg-abyss-900/60 px-3 py-1.5">
                <span className="text-slate-500">Readings</span>
                <span className="data-value text-slate-200">{d.reading_count?.toLocaleString() ?? '—'}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-abyss-900/60 px-3 py-1.5">
                <span className="text-slate-500">Last seen</span>
                <span className="data-value text-slate-200">{fmtRelative(d.last_seen)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Component health */}
      <div className="mt-4 card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">ODYSSEY-001 Components</h3>
          <Badge tone="ok"><Dot tone="ok" pulse /> ALL SYSTEMS NOMINAL</Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {health.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-lg border border-abyss-600/40 bg-abyss-900/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{componentIcon[h.component] || '🔩'}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{h.component}</div>
                  <div className="text-[11px] text-slate-500">{h.value || '—'}</div>
                </div>
              </div>
              <Badge tone={toneFor(h.status)}>{h.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Communication + sync */}
      <div className="mt-4 card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Communication & Synchronization</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-abyss-600/40 bg-abyss-900/50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="text-2xl">📶</span>
              <span>Link</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Dot tone={comm?.online ? 'ok' : 'crit'} pulse />
              <span className={`text-lg font-bold ${comm?.online ? 'text-emerald-300' : 'text-red-300'}`}>
                {comm?.online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-abyss-600/40 bg-abyss-900/50 p-4">
            <div className="text-sm text-slate-400">Last sync</div>
            <div className="data-value mt-2 text-lg font-bold text-white">{comm ? fmtRelative(comm.last_sync) : '—'}</div>
          </div>
          <div className="rounded-lg border border-abyss-600/40 bg-abyss-900/50 p-4">
            <div className="text-sm text-slate-400">Pending sync</div>
            <div className="data-value mt-2 text-lg font-bold text-white">{comm?.pending_records ?? '—'} records</div>
            <div className="text-[11px] text-slate-500">{comm?.auto_sync ? 'Auto-sync enabled' : 'Auto-sync off'}</div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          The STM32 validates and filters every measurement before storage; MicroSD retains local continuity during link loss.
        </p>
      </div>
    </div>
  );
}
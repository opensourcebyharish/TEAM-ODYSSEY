import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Badge, { Dot } from '../components/Badge';
import LiveChart from '../components/LiveChart';
import { useLiveReading } from '../lib/useLiveReading';
import { sensorsApi } from '../lib/api';
import type { SensorReading } from '../lib/types';
import { fmtDuration } from '../lib/format';

function MetricBar({ label, value, max, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = max ? Math.min(100, (Math.abs(value) / max) * 100) : Math.min(100, Math.abs(value) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
        <span>{label}</span>
        <span className="data-value text-slate-200">{value.toFixed(2)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-abyss-700/60">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SensorPanel({ title, icon, children, ok = true }: { title: string; icon: string; children: React.ReactNode; ok?: boolean }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="text-lg">{icon}</span> {title}
        </h3>
        <Badge tone={ok ? 'ok' : 'warn'}>{ok ? 'Normal' : 'Attention'}</Badge>
      </div>
      {children}
    </div>
  );
}

export default function LiveMonitoringPage() {
  const { latest, series, snapshot } = useLiveReading(120);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const r: SensorReading | null = latest || snapshot?.latest || null;
  const data = series.length ? series : snapshot?.readings || [];

  const tempSeries = data.map((x) => ({ t: new Date(x.timestamp).getTime(), temperature: x.temperature ?? 0 }));
  const pressSeries = data.map((x) => ({ t: new Date(x.timestamp).getTime(), pressure: x.pressure ?? 0 }));
  const depthSeries = data.map((x) => ({ t: new Date(x.timestamp).getTime(), depth: x.depth ?? 0 }));

  const temps = data.map((x) => x.temperature ?? 0).filter((v) => !Number.isNaN(v));
  const minT = temps.length ? Math.min(...temps) : 0;
  const maxT = temps.length ? Math.max(...temps) : 0;
  const avgT = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;

  return (
    <div>
      <PageHeader title="Live Monitoring" subtitle="Every sensor in real time — streaming over WebSocket from the STM32 acquisition stack">
        <Badge tone="ok"><Dot tone="ok" pulse /> LIVE</Badge>
      </PageHeader>

      {/* Key sensor row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Temperature */}
        <SensorPanel title="Temperature — DS18B20" icon="🌡️">
          <div className="mb-3 grid grid-cols-2 gap-2 text-center md:grid-cols-4">
            <div className="rounded-lg bg-abyss-900/60 p-2">
              <div className="text-[10px] uppercase text-slate-500">Current</div>
              <div className="data-value text-xl font-bold text-teal-300">{r?.temperature?.toFixed(2) ?? '—'}</div>
              <div className="text-[10px] text-slate-500">°C</div>
            </div>
            <div className="rounded-lg bg-abyss-900/60 p-2">
              <div className="text-[10px] uppercase text-slate-500">Min</div>
              <div className="data-value text-xl font-bold text-cyan-300">{minT.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500">°C</div>
            </div>
            <div className="rounded-lg bg-abyss-900/60 p-2">
              <div className="text-[10px] uppercase text-slate-500">Max</div>
              <div className="data-value text-xl font-bold text-cyan-300">{maxT.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500">°C</div>
            </div>
            <div className="rounded-lg bg-abyss-900/60 p-2">
              <div className="text-[10px] uppercase text-slate-500">Avg</div>
              <div className="data-value text-xl font-bold text-slate-100">{avgT.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500">°C</div>
            </div>
          </div>
          <LiveChart data={tempSeries} dataKey="temperature" unit="°C" height={110} />
        </SensorPanel>

        {/* Pressure + depth */}
        <SensorPanel title="Pressure / Depth — BMP180" icon="🌀">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-abyss-900/60 p-3">
              <div className="text-[10px] uppercase text-slate-500">Pressure</div>
              <div className="data-value text-2xl font-bold text-cyan-300">{r?.pressure != null ? r.pressure.toFixed(1) : '—'}<span className="text-xs text-slate-400"> hPa</span></div>
            </div>
            <div className="rounded-lg bg-abyss-900/60 p-3">
              <div className="text-[10px] uppercase text-slate-500">Depth</div>
              <div className="data-value text-2xl font-bold text-teal-300">{r?.depth != null ? r.depth.toFixed(1) : '—'}<span className="text-xs text-slate-400"> m</span></div>
            </div>
          </div>
          <div className="space-y-2.5">
            <MetricBar label="Pressure relative to surface" value={r ? (r.pressure ?? 1013) - 1013 : 0} max={20} color="#22d3ee" />
            <MetricBar label="Depth" value={r?.depth ?? 0} max={60} color="#2dd4bf" />
          </div>
          <div className="mt-3">
            <LiveChart data={pressSeries} dataKey="pressure" unit="hPa" color="#22d3ee" height={100} gradientId="cyanGrad2" />
          </div>
        </SensorPanel>

        {/* RTC / clock */}
        <SensorPanel title="RTC — DS1307" icon="🕐">
          <div className="mb-3 rounded-lg bg-abyss-900/60 p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">UTC Time</div>
            <div className="data-value my-1 text-4xl font-bold text-white">
              {now.toISOString().slice(11, 19)}
            </div>
            <div className="text-xs text-slate-400">
              {now.toISOString().slice(0, 10)} · {now.toLocaleDateString('en-GB', { weekday: 'long' })}
            </div>
          </div>
          <div className="rounded-lg bg-abyss-900/60 p-3 text-center">
            <div className="text-[10px] uppercase text-slate-500">Last reading</div>
            <div className="data-value text-sm text-slate-300">
              {r ? new Date(r.timestamp).toISOString().slice(11, 19) : '—'} UTC
            </div>
            <div className="text-[10px] text-slate-500">Sample # {r?.id ?? '—'}</div>
          </div>
        </SensorPanel>
      </div>

      {/* MPU6050 IMU */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SensorPanel title="MPU6050 — Accelerometer" icon="📈">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(['accel_x', 'accel_y', 'accel_z'] as const).map((k, i) => {
              const color = ['#f87171', '#fbbf24', '#34d399'][i];
              return (
                <div key={k} className="rounded-lg bg-abyss-900/60 p-3 text-center">
                  <div className="text-[10px] uppercase text-slate-500">{k.replace('accel_', '')}</div>
                  <div className="data-value text-2xl font-bold" style={{ color }}>
                    {(r?.[k] ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">g</div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2.5">
            <MetricBar label="Accel X" value={r?.accel_x ?? 0} max={0.2} color="#f87171" />
            <MetricBar label="Accel Y" value={r?.accel_y ?? 0} max={0.2} color="#fbbf24" />
            <MetricBar label="Accel Z (gravity)" value={(r?.accel_z ?? 1) - 1} max={0.2} color="#34d399" />
          </div>
        </SensorPanel>

        <SensorPanel title="MPU6050 — Gyroscope" icon="🎯">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(['gyro_x', 'gyro_y', 'gyro_z'] as const).map((k, i) => {
              const color = ['#22d3ee', '#a78bfa', '#5eead4'][i];
              return (
                <div key={k} className="rounded-lg bg-abyss-900/60 p-3 text-center">
                  <div className="text-[10px] uppercase text-slate-500">{k.replace('gyro_', '')}</div>
                  <div className="data-value text-2xl font-bold" style={{ color }}>
                    {(r?.[k] ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">°/s</div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2.5">
            <MetricBar label="Gyro X" value={r?.gyro_x ?? 0} max={3} color="#22d3ee" />
            <MetricBar label="Gyro Y" value={r?.gyro_y ?? 0} max={3} color="#a78bfa" />
            <MetricBar label="Gyro Z" value={r?.gyro_z ?? 0} max={3} color="#5eead4" />
          </div>
        </SensorPanel>
      </div>

      {/* Depth + mission state trace */}
      <div className="mt-4 card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Depth Trace — Bathymetry</h3>
          <span className="data-value text-xs text-teal-400">{r?.depth != null ? `${r.depth.toFixed(1)} m` : '—'}</span>
        </div>
        <LiveChart data={depthSeries} dataKey="depth" unit="m" color="#5eead4" height={140} gradientId="mintGrad" />
      </div>

      {/* Status strip */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center justify-between p-3 text-sm">
          <span className="text-slate-400">Mission state</span>
          <Badge tone="teal">{r?.status || '—'}</Badge>
        </div>
        <div className="card flex items-center justify-between p-3 text-sm">
          <span className="text-slate-400">Device</span>
          <span className="data-value text-slate-200">{r?.device_id || '—'}</span>
        </div>
        <div className="card flex items-center justify-between p-3 text-sm">
          <span className="text-slate-400">Battery</span>
          <span className="data-value text-slate-200">{r?.battery != null ? `${r.battery.toFixed(1)} %` : '—'}</span>
        </div>
        <div className="card flex items-center justify-between p-3 text-sm">
          <span className="text-slate-400">Stream uptime</span>
          <span className="data-value text-slate-200">{fmtDuration(data.length * 5)}</span>
        </div>
      </div>

      </div>
  );
}
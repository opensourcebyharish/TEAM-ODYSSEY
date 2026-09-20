import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import { sensorsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { SensorReading } from '../lib/types';

export default function AnalyticsPage() {
  const { can } = useAuth();
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [hours, setHours] = useState(6);
  const [sensor, setSensor] = useState<'temperature' | 'pressure' | 'depth' | 'battery'>('temperature');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const from = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    sensorsApi.history({ from, limit: 1200 })
      .then((r) => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hours]);

  const chartData = useMemo(
    () =>
      [...history].reverse().map((r) => ({
        t: new Date(r.timestamp).getTime(),
        temperature: r.temperature ?? null,
        pressure: r.pressure ?? null,
        depth: r.depth ?? null,
        battery: r.battery ?? null,
        accel_x: r.accel_x ?? 0,
        accel_y: r.accel_y ?? 0,
        accel_z: r.accel_z ?? 0,
        gyro_x: r.gyro_x ?? 0,
        gyro_y: r.gyro_y ?? 0,
        gyro_z: r.gyro_z ?? 0,
        mission: r.mission_id ?? 0,
      })),
    [history]
  );

  const metricConfig: Record<string, { color: string; unit: string; domain: [number, number] }> = {
    temperature: { color: '#2dd4bf', unit: '°C', domain: [-5, 5] },
    pressure: { color: '#22d3ee', unit: 'hPa', domain: [1000, 1040] },
    depth: { color: '#5eead4', unit: 'm', domain: [0, 80] },
    battery: { color: '#34d399', unit: '%', domain: [0, 100] },
  };

  const cfg = metricConfig[sensor];
  const canExport = can('admin', 'researcher');

  return (
    <div>
      <PageHeader title="Sensor Analytics" subtitle="Analyse collected measurements over time">
        <Badge tone="info">{history.length} samples</Badge>
      </PageHeader>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="label">Time window</label>
          <select className="input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            <option value={1}>Last 1 hour</option>
            <option value={3}>Last 3 hours</option>
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
          </select>
        </div>
        <div>
          <label className="label">Metric</label>
          <select className="input" value={sensor} onChange={(e) => setSensor(e.target.value as typeof sensor)}>
            <option value="temperature">Temperature</option>
            <option value="pressure">Pressure</option>
            <option value="depth">Depth</option>
            <option value="battery">Battery</option>
          </select>
        </div>
        <div className="ml-auto text-xs text-slate-500">
          {loading ? 'Loading…' : 'Live data from server history'}
        </div>
      </div>

      {/* Main chart */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white capitalize">{sensor} vs Time</h3>
          <span className="data-value text-xs" style={{ color: cfg.color }}>
            {chartData.length ? `${chartData[chartData.length - 1][sensor]?.toFixed(2) ?? '—'} ${cfg.unit}` : '—'}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1d2942" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(v) => new Date(v).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })}
              stroke="#475569" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#1d2942' }}
            />
            <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={cfg.domain} width={56} />
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="chart-tooltip">
                    <div className="mb-1 text-[10px] uppercase text-slate-400">{new Date(label).toLocaleString('en-GB', { hour12: false })}</div>
                    {payload.map((p: any) => (
                      <div key={p.dataKey} className="data-value text-xs" style={{ color: p.stroke }}>
                        {sensor}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value} {cfg.unit}
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey={sensor} stroke={cfg.color} strokeWidth={2.5} dot={false} isAnimationActive={false} name={sensor} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Secondary charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">Acceleration — X / Y / Z</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1d2942" vertical={false} />
              <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })} stroke="#475569" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1d2942' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} width={40} tickLine={false} axisLine={false} domain={[-1.5, 1.5]} />
              <Tooltip contentStyle={{ background: '#0a1122', border: '1px solid #22304f', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="linear" dataKey="accel_x" name="X" stroke="#f87171" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              <Line type="linear" dataKey="accel_y" name="Y" stroke="#fbbf24" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              <Line type="linear" dataKey="accel_z" name="Z" stroke="#34d399" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {history.slice(-1).map((r) => (
              <div key={`accel-${r.id}`} className="flex justify-between rounded-lg bg-abyss-900/60 px-2 py-1 text-xs">
                {(['x', 'y', 'z'] as const).map((k, i) => (
                  <span key={k} className="data-value" style={{ color: ['#f87171', '#fbbf24', '#34d399'][i] }}>
                    {k}: {(r[`accel_${k}` as 'accel_x'] ?? 0).toFixed(2)}g
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">Gyroscope — X / Y / Z</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1d2942" vertical={false} />
              <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })} stroke="#475569" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1d2942' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} width={40} tickLine={false} axisLine={false} domain={[-3, 3]} />
              <Tooltip contentStyle={{ background: '#0a1122', border: '1px solid #22304f', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="linear" dataKey="gyro_x" name="X" stroke="#22d3ee" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              <Line type="linear" dataKey="gyro_y" name="Y" stroke="#a78bfa" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              <Line type="linear" dataKey="gyro_z" name="Z" stroke="#5eead4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {history.slice(-1).map((r) => (
              <div key={`gyro-${r.id}`} className="flex justify-between rounded-lg bg-abyss-900/60 px-2 py-1 text-xs">
                {(['x', 'y', 'z'] as const).map((k, i) => (
                  <span key={k} className="data-value" style={{ color: ['#22d3ee', '#a78bfa', '#5eead4'][i] }}>
                    {k}: {(r[`gyro_${k}` as 'gyro_x'] ?? 0).toFixed(1)}°/s
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ['Avg temperature', calcAvg(history, 'temperature'), '°C'],
          ['Avg pressure', calcAvg(history, 'pressure'), 'hPa'],
          ['Avg depth', calcAvg(history, 'depth'), 'm'],
          ['Avg battery', calcAvg(history, 'battery'), '%'],
        ].map(([label, value, unit]) => (
          <div key={label as string} className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
            <div className="data-value mt-1 text-xl font-bold text-white">{value}<span className="ml-1 text-xs text-slate-400">{unit}</span></div>
          </div>
        ))}
      </div>

      {!canExport && (
        <p className="mt-4 text-xs text-slate-500">Researcher / admin roles can export this analytics window.</p>
      )}
    </div>
  );
}

function calcAvg(rows: SensorReading[], key: 'temperature' | 'pressure' | 'depth' | 'battery'): number | string {
  const vals = rows.map((r) => r[key]).filter((v): v is number => v != null);
  if (!vals.length) return '—';
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import StatusCard from '../components/StatusCard';
import LiveChart from '../components/LiveChart';
import MissionStep from '../components/MissionStep';
import Badge, { MissionStatusBadge, PhaseBadge, Dot } from '../components/Badge';
import { useLiveReading } from '../lib/useLiveReading';
import { missionsApi, alertsApi, deviceApi } from '../lib/api';
import { onLive } from '../lib/socket';
import { fmtDuration, fmtRelative } from '../lib/format';
import type { Alert, CommStatus, Mission } from '../lib/types';

export default function DashboardPage() {
  const { latest, series, summary, snapshot } = useLiveReading(150);
  const [mission, setMission] = useState<Mission | null>(null);
  const [comm, setComm] = useState<CommStatus | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);

  // Bootstrap mission + comm + alerts
  useEffect(() => {
    missionsApi.current().then((r) => setMission(r.data)).catch(() => {});
    deviceApi.comm().then((r) => setComm(r.data)).catch(() => {});
    alertsApi.list({ acknowledged: 0, limit: 8 }).then((r) => setRecentAlerts(r.data)).catch(() => {});
  }, []);

  // Keep mission live over WS
  useEffect(() => {
    const off = onLive('mission:update', (m: Mission) => setMission(m));
    return off;
  }, []);

  const tempSeries = (series.length ? series : snapshot?.readings || []).map((r) => ({
    t: new Date(r.timestamp).getTime(),
    temperature: r.temperature ?? 0,
  }));
  const pressureSeries = (series.length ? series : snapshot?.readings || []).map((r) => ({
    t: new Date(r.timestamp).getTime(),
    pressure: r.pressure ?? 0,
  }));

  const temp = latest?.temperature;
  const tempTone = temp != null && (temp < -4 || temp > 2) ? 'warn' : 'ok';
  const batt = latest?.battery ?? snapshot?.latest?.battery;
  const battTone = batt != null ? (batt <= 15 ? 'crit' : batt <= 30 ? 'warn' : 'ok') : 'off';

  return (
    <div>
      <PageHeader
        title="Mission Dashboard"
        subtitle="Real-time overview of the ODYSSEY platform"
      >
        {comm && (
          <span className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            comm.online ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-red-500/40 bg-red-500/10 text-red-300'}`}
          >
            <Dot tone={comm.online ? 'ok' : 'crit'} pulse />
            {comm.online ? 'COMMUNICATION ONLINE' : 'COMMUNICATION OFFLINE'}
          </span>
        )}
      </PageHeader>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatusCard
          label="Temperature"
          icon="🌡️"
          value={temp != null ? temp.toFixed(1) : '—'}
          unit="°C"
          sub={summary ? `Min ${summary.temp_min} · Max ${summary.temp_max}` : undefined}
          tone={tempTone}
        />
        <StatusCard
          label="Pressure"
          icon="🌀"
          value={latest?.pressure != null ? Math.round(latest.pressure) : '—'}
          unit="hPa"
          sub={summary ? `Avg ${summary.press_avg.toFixed(1)} hPa` : undefined}
        />
        <StatusCard
          label="Battery"
          icon="🔋"
          value={batt != null ? Math.round(batt) : '—'}
          unit="%"
          sub={batt != null ? (batt <= 15 ? 'Critical — surface recommended' : batt <= 30 ? 'Power-saving mode' : 'Nominal') : undefined}
          tone={battTone}
        />
        <StatusCard
          label="Depth"
          icon="🌊"
          value={latest?.depth != null ? latest.depth.toFixed(1) : '—'}
          unit="m"
          sub={summary ? `Max ${summary.depth_max.toFixed(1)} m` : undefined}
          tone={latest?.status === 'SURFACE' ? 'warn' : 'ok'}
        />
      </div>

      {/* Live charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Live Temperature</h3>
            <span className="data-value text-xs text-teal-400">{temp != null ? `${temp.toFixed(2)} °C` : '—'}</span>
          </div>
          <LiveChart data={tempSeries} dataKey="temperature" unit="°C" color="#2dd4bf" height={190} />
        </div>
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Live Pressure</h3>
            <span className="data-value text-xs text-cyan-400">
              {latest?.pressure != null ? `${latest.pressure.toFixed(1)} hPa` : '—'}
            </span>
          </div>
          <LiveChart
            data={pressureSeries}
            dataKey="pressure"
            unit="hPa"
            color="#22d3ee"
            height={190}
            gradientId="cyanGrad"
          />
        </div>
      </div>

      {/* Mission + Alerts row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Mission status */}
        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Mission Status</h3>
            {mission && <MissionStatusBadge status={mission.status} />}
          </div>

          {mission ? (
            <>
              <div className="mb-4">
                <div className="text-lg font-bold text-white">{mission.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                  <PhaseBadge phase={mission.current_phase} />
                  <span>Mission time: <span className="data-value text-slate-200">{fmtDuration(mission.elapsed_seconds)}</span></span>
                  <span>·</span>
                  <span>Data: <span className="data-value text-slate-200">{mission.data_points?.toLocaleString()}</span></span>
                </div>
              </div>
              <MissionStep currentPhase={mission.current_phase} />
            </>
          ) : (
            <div className="py-6 text-center text-sm text-slate-500">No active mission.</div>
          )}

          {/* Decision engine preview */}
          <div className="mt-4 rounded-lg border border-abyss-600/40 bg-abyss-900/50 p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-teal-400">
              Decision Engine
            </div>
            {(latest?.battery ?? 90) <= 15 ? (
              <div className="flex items-center gap-2 text-sm text-red-300">
                🔴 LOW BATTERY — reducing sampling, preparing surface
              </div>
            ) : (latest?.status === 'SURFACE') ? (
              <div className="flex items-center gap-2 text-sm text-amber-300">
                🟡 SURFACING — preparing transmit window
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                🟢 SYSTEM SAFE — continuing mission
                <span className="text-xs text-slate-500">({latest?.status || 'SENSE'})</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Alerts</h3>
            <Link to="/alerts" className="text-xs text-teal-400 hover:text-teal-300">View all →</Link>
          </div>
          {recentAlerts.length === 0 ? (
            <div className="py-6 text-center text-sm text-emerald-400">🟢 No critical alerts</div>
          ) : (
            <ul className="space-y-2">
              {recentAlerts.slice(0, 6).map((a) => (
                <li key={a.id} className="rounded-lg border border-abyss-600/40 bg-abyss-900/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={a.severity === 'critical' ? 'crit' : a.severity === 'warning' ? 'warn' : 'info'}>
                      {a.severity}
                    </Badge>
                    <span className="text-[10px] text-slate-500">{fmtRelative(a.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer strip — data continuity */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="text-2xl">💾</span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Local Data Log (MicroSD)</div>
            <div className="text-sm font-semibold text-white">{summary?.samples?.toLocaleString() ?? '—'} samples</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="text-2xl">📶</span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Last Sync</div>
            <div className="text-sm font-semibold text-white">
              {comm ? fmtRelative(comm.last_sync) : '—'}
              {comm ? ` · ${comm.pending_records} pending` : ''}
            </div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="text-2xl">⚙️</span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Sampling Interval</div>
            <div className="text-sm font-semibold text-white">{mission?.sampling_interval ?? '—'} seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
}
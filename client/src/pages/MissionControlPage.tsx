import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Badge, { MissionStatusBadge, PhaseBadge } from '../components/Badge';
import MissionStep from '../components/MissionStep';
import { missionsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { onLive } from '../lib/socket';
import { fmtDuration, fmtDateTime } from '../lib/format';
import type { Mission } from '../lib/types';

export default function MissionControlPage() {
  const { can } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: 'NEW MISSIONS — SEASONAL SURVEY', samplingInterval: 10, maxDepth: 100, durationHours: 24 });

  useEffect(() => {
    missionsApi.current().then((r) => setMission(r.data)).catch(() => {});
    const off = onLive('mission:update', (m: Mission) => setMission(m));
    return off;
  }, []);

  async function act(command: 'start' | 'pause' | 'resume' | 'abort') {
    setBusy(command);
    setError('');
    try {
      const handler = { start: missionsApi.start, pause: missionsApi.pause, resume: missionsApi.resume, abort: missionsApi.abort }[command];
      const { data } = await handler(command === 'start' ? mission?.id : undefined as never);
      setMission(data);
    } catch (e: any) {
      setError(e.response?.data?.error || `${command} failed`);
    } finally {
      setBusy(null);
    }
  }

  async function createMission() {
    setBusy('create');
    setError('');
    try {
      const { data } = await missionsApi.create({
        name: draft.name,
        sampling_interval: draft.samplingInterval,
        max_depth: draft.maxDepth,
        duration_hours: draft.durationHours,
      });
      setMission(data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Create failed');
    } finally {
      setBusy(null);
    }
  }

  const running = mission?.status === 'running';
  const paused = mission?.status === 'paused';
  const canControl = can('admin', 'operator');

  return (
    <div>
      <PageHeader title="Mission Control" subtitle="Autonomous mission management — start, configure, and command ODYSSEY">
        {mission && <MissionStatusBadge status={mission.status} />}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Mission detail */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">{mission?.name || 'No mission selected'}</h2>
              <p className="mt-1 text-sm text-slate-400">{mission?.description || 'Configure and start a mission below.'}</p>
            </div>
            <PhaseBadge phase={mission?.current_phase || 'IDLE'} />
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Mission time', fmtDuration((mission as any)?.elapsed_seconds), '⏱️'],
              ['Data points', mission?.data_points?.toLocaleString() ?? '—', '📊'],
              ['Sampling', mission ? `${mission.sampling_interval}s` : '—', '🎚️'],
              ['Started', fmtDateTime(mission?.start_time), '📅'],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-lg bg-abyss-900/60 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">{icon} {label}</div>
                <div className="data-value mt-1 text-sm font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>

          {/* Phase stepper */}
          <div className="mt-5">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Mission sequence — DIVE → DRIFT → SENSE → DECIDE → SURFACE → TRANSMIT
            </div>
            <MissionStep currentPhase={mission?.current_phase || 'IDLE'} />
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap gap-3">
            {!running && !paused && (
              <button
                className="btn-primary"
                disabled={busy === 'start' || !canControl}
                onClick={() => act('start')}
              >
                ▶ {busy === 'start' ? 'Starting…' : 'START MISSION'}
              </button>
            )}
            {running && (
              <button className="btn-ghost" disabled={busy === 'pause' || !canControl} onClick={() => act('pause')}>
                ⏸ PAUSE
              </button>
            )}
            {paused && (
              <button className="btn-primary" disabled={busy === 'resume' || !canControl} onClick={() => act('resume')}>
                ▶ RESUME
              </button>
            )}
            {(running || paused) && (
              <button className="btn-danger" disabled={busy === 'abort' || !canControl} onClick={() => act('abort')}>
                ⏹ ABORT MISSION
              </button>
            )}
          </div>

          {!canControl && (
            <p className="mt-3 text-xs text-amber-400">Your current role is read-only for mission commands.</p>
          )}
        </div>

        {/* Decision engine */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-400">Decision Engine</h3>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ['Input validation', 'PASS', 'ok'],
              ['Filtering', 'PASS', 'ok'],
              ['Mission algorithm', mission ? (running ? 'ACTIVE' : mission.status.toUpperCase()) : 'STANDBY', running ? 'ok' : 'off'],
            ].map(([label, val, tone]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-abyss-600/40 bg-abyss-900/50 px-3 py-2.5">
                <span className="text-slate-400">{label}</span>
                <Badge tone={tone as string}>{val}</Badge>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-abyss-600/40 bg-abyss-900/50 p-3 text-xs leading-relaxed text-slate-400">
            <div className="mb-1 font-semibold text-slate-300">Suggested action</div>
            {running ? (
              <span className="text-emerald-300">🟢 SYSTEM SAFE — continue mission at configured interval.</span>
            ) : paused ? (
              <span className="text-amber-300">🟡 HOLDING — awaiting resume command.</span>
            ) : (
              <span className="text-slate-400">⚪ No active mission — configure and start.</span>
            )}
          </div>
        </div>
      </div>

      {/* Mission configuration */}
      <div className="mt-4 card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Mission Configuration</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Mission name</label>
            <input className="input w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Sampling interval</label>
            <div className="flex items-center gap-2">
              <input
                type="number" className="input w-full" min={1} value={draft.samplingInterval}
                onChange={(e) => setDraft({ ...draft, samplingInterval: Number(e.target.value) })}
              />
              <span className="text-xs text-slate-500">s</span>
            </div>
          </div>
          <div>
            <label className="label">Maximum depth</label>
            <div className="flex items-center gap-2">
              <input
                type="number" className="input w-full" min={1} value={draft.maxDepth}
                onChange={(e) => setDraft({ ...draft, maxDepth: Number(e.target.value) })}
              />
              <span className="text-xs text-slate-500">m</span>
            </div>
          </div>
          <div>
            <label className="label">Duration</label>
            <div className="flex items-center gap-2">
              <input
                type="number" className="input w-full" min={1} value={draft.durationHours}
                onChange={(e) => setDraft({ ...draft, durationHours: Number(e.target.value) })}
              />
              <span className="text-xs text-slate-500">h</span>
            </div>
          </div>
          <div className="flex items-end">
            <button className="btn-ghost w-full" disabled={busy === 'create' || !can('admin', 'operator', 'researcher')} onClick={createMission}>
              ＋ {busy === 'create' ? 'Creating…' : 'CREATE MISSION'}
            </button>
          </div>
        </div>
        {error && <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
      </div>
    </div>
  );
}
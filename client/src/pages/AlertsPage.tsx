import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import { alertsApi, eventsApi } from '../lib/api';
import { onLive } from '../lib/socket';
import { useAuth } from '../lib/auth';
import { fmtDateTime, fmtRelative } from '../lib/format';
import type { Alert, SystemEvent } from '../lib/types';

const severityTone: Record<string, string> = { info: 'info', warning: 'warn', critical: 'crit' };
const severityIcon: Record<string, string> = { info: 'ℹ️', warning: '⚠️', critical: '🔴' };

export default function AlertsPage() {
  const { can, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'critical' | 'unack'>('all');
  const [stats, setStats] = useState<{ total: number; unacknowledged: number; by_severity: Record<string, number> } | null>(null);

  const refresh = useCallback(() => {
    alertsApi.list({ limit: 200 }).then((r) => setAlerts(r.data)).catch(() => {});
    alertsApi.stats().then((r) => setStats(r.data)).catch(() => {});
    eventsApi.list({ limit: 100 }).then((r) => setEvents(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    return onLive('alert:new', () => refresh());
  }, [refresh]);

  const visible = alerts.filter((a) =>
    filter === 'all' ? true : filter === 'unack' ? !a.acknowledged : a.severity === filter
  );

  async function acknowledge(id: number) {
    await alertsApi.acknowledge(id);
    refresh();
  }

  async function acknowledgeAll() {
    await alertsApi.acknowledgeAll();
    refresh();
  }

  const canAck = can('admin', 'operator', 'researcher');

  return (
    <div>
      <PageHeader title="Alerts & Events" subtitle="Threshold violations, system warnings, and the audit event stream">
        {stats && stats.unacknowledged > 0 && <Badge tone="crit">{stats.unacknowledged} unacknowledged</Badge>}
      </PageHeader>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        {[['all', 'All'], ['unack', `Unacknowledged (${stats?.unacknowledged ?? 0})`], ['critical', `Critical (${stats?.by_severity?.critical ?? 0})`], ['warning', `Warning (${stats?.by_severity?.warning ?? 0})`], ['info', `Info (${stats?.by_severity?.info ?? 0})`]].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k as never)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === k ? 'bg-teal-500/15 text-teal-300 border border-teal-500/40' : 'border border-abyss-600 text-slate-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
        {canAck && (
          <button onClick={acknowledgeAll} className="ml-auto rounded-lg border border-abyss-600 px-3 py-1.5 text-xs text-slate-400 hover:border-teal-500/50 hover:text-teal-300">
            ✓ Acknowledge all
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Alerts */}
        <div className="space-y-2">
          {visible.length === 0 && (
            <div className="card p-6 text-center text-sm text-emerald-400">🟢 No alerts in this view.</div>
          )}
          {visible.map((a) => (
            <div key={a.id} className={`card flex items-start gap-3 p-4 ${a.acknowledged ? 'opacity-50' : ''}`}>
              <span className="text-lg">{severityIcon[a.severity]}</span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={severityTone[a.severity]}>{a.alert_type} · {a.severity}</Badge>
                  {a.acknowledged ? (
                    <Badge tone="off">✓ Ack {a.acked_by_name ? `by ${a.acked_by_name}` : ''}</Badge>
                  ) : (
                    <span className="text-[10px] uppercase text-amber-400">Open</span>
                  )}
                  <span className="ml-auto text-[11px] text-slate-500">{fmtRelative(a.timestamp)}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-200">{a.message}</p>
                {a.sensor_value != null && (
                  <div className="data-value mt-1 text-xs text-slate-400">
                    value: {a.sensor_value} {a.threshold != null ? `/ threshold: ${a.threshold}` : ''}
                  </div>
                )}
                {!a.acknowledged && canAck && (
                  <button onClick={() => acknowledge(a.id)} className="mt-2 rounded-lg border border-abyss-600 px-2.5 py-1 text-xs text-slate-300 hover:border-teal-500/50 hover:text-teal-300">
                    ✓ Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* System event log */}
        <div className="card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-abyss-600/40 px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">System Event Log</h3>
            <span className="text-[10px] uppercase text-slate-500">{user?.username ?? 'operator'}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: 560 }}>
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 border-b border-abyss-700/20 py-2 text-xs">
                <span className="data-value shrink-0 text-[10px] text-slate-500">{fmtDateTime(e.timestamp)}</span>
                <span className="shrink-0">
                  <Badge tone={severityTone[e.severity] || 'info'}>{e.severity}</Badge>
                </span>
                <div className="min-w-0">
                  <span className="text-slate-300">{e.message}</span>
                  {e.source && <span className="ml-1.5 text-[10px] text-teal-500/70">{e.source}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
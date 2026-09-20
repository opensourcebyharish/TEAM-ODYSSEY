import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import { authApi } from '../lib/api';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Settings, User } from '../lib/types';

export default function SettingsPage() {
  const { can } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [saved, setSaved] = useState(false);
  const [simEnabled, setSimEnabled] = useState(true);
  const isAdmin = can('admin');

  useEffect(() => {
    api.get('/settings').then((r) => {
      const map: Record<string, string> = {};
      (r.data as { key: string; value: string }[]).forEach((s) => { map[s.key] = s.value; });
      setSettings(map as unknown as Settings);
      setSimEnabled(map.sim_enabled !== 'false');
    }).catch(() => {});
    if (isAdmin) {
      authApi.users().then((r) => setUsers(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  async function save() {
    if (!settings) return;
    await api.post('/settings', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(key: keyof Settings, value: string) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  return (
    <div>
      <PageHeader title="System Settings" subtitle="Mission thresholds, acquisition parameters, and access control">
        {saved && <Badge tone="ok">Saved</Badge>}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sensor thresholds */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Alert Thresholds</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {([
              ['temperature_min', 'Min temperature (°C)', settings?.temperature_min],
              ['temperature_max', 'Max temperature (°C)', settings?.temperature_max],
              ['pressure_max', 'Max pressure (hPa)', settings?.pressure_max],
              ['battery_critical', 'Critical battery (%)', settings?.battery_critical],
              ['battery_warning', 'Warning battery (%)', settings?.battery_warning],
              ['sampling_interval', 'Sampling interval (s)', settings?.sampling_interval],
            ] as [keyof Settings, string, string | undefined][]).map(([key, label, value]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  type="number"
                  className="input w-full data-value"
                  value={value ?? ''}
                  onChange={(e) => update(key, e.target.value)}
                  step={key === 'temperature_min' || key === 'temperature_max' ? 0.5 : 1}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-abyss-600/40 bg-abyss-900/50 px-4 py-3">
            <span className="text-sm text-slate-300">Sensor simulator</span>
            <button
              onClick={() => setSimEnabled((s) => !s)}
              className={`relative h-6 w-11 rounded-full transition-colors ${simEnabled ? 'bg-teal-500' : 'bg-abyss-700'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${simEnabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <button className="btn-primary mt-5" onClick={save}>💾 SAVE SETTINGS</button>
        </div>

        {/* Users */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Users & Roles</h3>
          {!isAdmin ? (
            <p className="mt-4 text-sm text-slate-500">Only administrators can manage users.</p>
          ) : (
            <div className="mt-4">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-abyss-600/40 text-[11px] uppercase text-slate-400">
                    <th className="pb-2">User</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-abyss-700/20">
                      <td className="py-2.5">
                        <span className="flex items-center gap-2 font-medium text-white">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-600/30 text-[10px] uppercase">{u.username.slice(0, 2)}</span>
                          {u.username}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Badge tone={u.role === 'admin' ? 'crit' : u.role === 'researcher' ? 'info' : u.role === 'operator' ? 'teal' : 'off'}>{u.role}</Badge>
                      </td>
                      <td className="data-value py-2.5 text-xs text-slate-400">{u.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 rounded-lg bg-abyss-900/50 p-3 text-[11px] text-slate-500">
                Roles: <strong className="text-red-300">ADMIN</strong> full access · <strong className="text-cyan-300">RESEARCHER</strong> monitoring + analytics + export · <strong className="text-teal-300">OPERATOR</strong> mission + monitoring · <strong className="text-slate-400">VIEWER</strong> read-only.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Architecture info */}
      <div className="mt-4 card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">System Architecture</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {['Sensors → STM32', 'Validation & Filter', 'MicroSD logging', 'ESP8266 Wi-Fi', 'HTTP / WebSocket', 'Mission Control backend', 'SQLite store', 'Realtime dashboard', 'GNSS + satellite (future)', 'Ice-aware layer (future)'].map((s) => (
            <span key={s} className="rounded-full border border-abyss-600/60 bg-abyss-900/60 px-3 py-1 text-slate-300">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
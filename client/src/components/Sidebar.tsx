import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/', icon: '🏠', label: 'Dashboard' },
  { to: '/live', icon: '📡', label: 'Live Monitoring' },
  { to: '/mission', icon: '🚀', label: 'Mission Control' },
  { to: '/map', icon: '🗺️', label: 'Map & Tracking' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/history', icon: '💾', label: 'Historical Data' },
  { to: '/alerts', icon: '⚠️', label: 'Alerts & Events' },
  { to: '/health', icon: '🔧', label: 'Device Health' },
  { to: '/export', icon: '📤', label: 'Data Export' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-abyss-600/40 bg-abyss-900/70 backdrop-blur">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-abyss-600/40 px-5 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-xl shadow-glow">
          🌊
        </span>
        <div>
          <div className="text-lg font-bold tracking-tight text-white">ODYSSEY</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Mission Control</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:bg-abyss-700/40 hover:text-slate-100 border border-transparent'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Session footer */}
      {user && (
        <div className="border-t border-abyss-600/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-xs font-bold text-white uppercase">
              {user.username.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{user.username}</div>
              <div className="text-[10px] uppercase tracking-wider text-teal-400">{user.role}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
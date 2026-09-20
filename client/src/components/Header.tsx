import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { onLive, connectSocket } from '../lib/socket';
import { utcClock } from '../lib/format';
import { alertsApi } from '../lib/api';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clock, setClock] = useState(utcClock());
  const [connected, setConnected] = useState(false);
  const [unacked, setUnacked] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setClock(utcClock()), 1000);
    return () => clearInterval(t);
  }, []);

  // Socket connection state
  useEffect(() => {
    const s = connectSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    setConnected(s.connected);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live alert count
  useEffect(() => {
    alertsApi.stats().then((r) => setUnacked(r.data.unacknowledged)).catch(() => {});
    const off = onLive('alert:new', () => setUnacked((n) => n + 1));
    return off;
  }, []);

  function doLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="flex items-center justify-between border-b border-abyss-600/40 bg-abyss-900/70 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-status-ok animate-pulse-slow' : 'bg-status-crit'}`} />
        <span className="text-sm font-semibold text-white">{connected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/alerts')}
          className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-abyss-700/50"
        >
          <span>⚠️</span>
          <span>Alerts</span>
          {unacked > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500/90 px-1 text-[10px] font-bold text-white">
              {unacked}
            </span>
          )}
        </button>

        <div className="hidden text-right md:block">
          <div className="data-value text-lg font-semibold leading-none text-white">{clock}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">UTC</div>
        </div>

        <button
          onClick={doLogout}
          className="flex items-center gap-2 rounded-lg border border-abyss-600 px-3 py-1.5 text-xs text-slate-400 hover:border-red-500/40 hover:text-red-400"
        >
          <span>{user?.username ?? 'user'}</span>
          <span className="text-red-400">↪</span>
        </button>
      </div>
    </header>
  );
}
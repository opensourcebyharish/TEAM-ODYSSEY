import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-abyss-950">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-ocean-gradient" />
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-teal-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up px-6">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-4xl shadow-glow">
            🌊
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">ODYSSEY</h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-teal-400">
            Southern Ocean Robotic Explorer
          </p>
          <p className="mt-2 text-sm text-slate-400">Autonomous Ocean Observation · Mission Control</p>
        </div>

        {/* Card */}
        <form
          onSubmit={submit}
          className="card space-y-4 p-6 shadow-2xl"
        >
          <div>
            <label className="label" htmlFor="username">Email / Username</label>
            <input
              id="username"
              className="input w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? 'Authenticating…' : 'LOGIN'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Demo credentials — <span className="data-value text-teal-400">admin</span> / <span className="data-value text-teal-400">odyssey2026</span>
        </p>

        {/* Footer tagline */}
        <p className="mt-8 text-center text-xs text-slate-600">
          Real-time web-based monitoring &amp; decision-support for autonomous ocean-observation systems.
        </p>
      </div>
    </div>
  );
}
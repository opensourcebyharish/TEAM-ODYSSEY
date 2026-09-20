import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { authApi } from './api';
import type { Role, User } from './types';

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  can: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('odyssey_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('odyssey_token'));
  const [user, setUser] = useState<User | null>(readStoredUser);

  async function login(username: string, password: string) {
    const { data } = await authApi.login(username, password);
    localStorage.setItem('odyssey_token', data.token);
    localStorage.setItem('odyssey_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('odyssey_token');
    localStorage.removeItem('odyssey_user');
    setToken(null);
    setUser(null);
  }

  function can(...roles: Role[]) {
    if (!user) return false;
    return roles.includes(user.role);
  }

  const value = useMemo(() => ({ user, token, login, logout, can }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
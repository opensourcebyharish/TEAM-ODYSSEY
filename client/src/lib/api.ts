import axios from 'axios';
import type {
  Alert, CommStatus, Device, DeviceHealth, Mission, SensorReading, SensorSummary,
  SystemEvent, User,
} from './types';

const api = axios.create({ baseURL: '/api' });

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('odyssey_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, drop the session and send the user to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('odyssey_token');
      localStorage.removeItem('odyssey_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { username, password }),
  me: () => api.get<User>('/auth/me'),
  users: () => api.get<User[]>('/auth/users'),
};

export const sensorsApi = {
  latest: () => api.get<SensorReading>('/sensors/latest'),
  history: (params?: { from?: string; to?: string; limit?: number }) =>
    api.get<SensorReading[]>('/sensors/history', { params }),
  summary: (hours?: number) =>
    api.get<SensorSummary>('/sensors/summary', { params: hours ? { hours } : {} }),
};

export const missionsApi = {
  list: () => api.get<Mission[]>('/missions'),
  current: () => api.get<Mission>('/mission/current'),
  create: (data: Partial<Mission>) => api.post<Mission>('/missions', data),
  start: (id?: number) => api.post<Mission>('/mission/start', id ? { id } : {}),
  pause: () => api.post<Mission>('/mission/pause'),
  resume: () => api.post<Mission>('/mission/resume'),
  abort: () => api.post<Mission>('/mission/abort'),
  configure: (id: number, data: Partial<Mission>) =>
    api.put<Mission>(`/missions/${id}/configuration`, data),
};

export const alertsApi = {
  list: (params?: { severity?: string; acknowledged?: number; limit?: number }) =>
    api.get<Alert[]>('/alerts', { params }),
  stats: () => api.get<{ total: number; unacknowledged: number; by_severity: Record<string, number> }>('/alerts/stats'),
  acknowledge: (id: number) => api.post<Alert>(`/alerts/${id}/acknowledge`),
  acknowledgeAll: () => api.post<{ acknowledged: number }>('/alerts/acknowledge-all'),
};

export const deviceApi = {
  status: () => api.get<Device[]>('/device/status'),
  health: (device?: string) =>
    api.get<DeviceHealth[]>('/device/health', { params: device ? { device } : {} }),
  comm: () => api.get<CommStatus>('/device/comm/status'),
};

export const eventsApi = {
  list: (params?: { severity?: string; limit?: number }) =>
    api.get<SystemEvent[]>('/system/events', { params }),
};

export const exportApi = {
  meta: () => api.get<{ readings: number; devices: number; earliest: string; latest: string }>('/data/export/meta'),
  csvUrl: (params?: Record<string, string | number>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return `/api/data/export/csv${qs ? `?${qs}` : ''}`;
  },
  jsonUrl: (params?: Record<string, string | number>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return `/api/data/export/json${qs ? `?${qs}` : ''}`;
  },
};

export default api;
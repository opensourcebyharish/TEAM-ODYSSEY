import { io, Socket } from 'socket.io-client';
import type { Alert, Mission, SensorReading, Snapshot, SystemEvent } from './types';

let socket: Socket | null = null;

/**
 * Connect (or return the existing) authenticated Socket.IO client.
 */
export function connectSocket(): Socket {
  if (socket) return socket;
  const token = localStorage.getItem('odyssey_token');
  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// Event payload helpers (typed)
export type LiveEvents = {
  'sensor:update': (r: SensorReading) => void;
  'system:event': (e: SystemEvent) => void;
  'alert:new': (a: Alert) => void;
  'mission:update': (m: Mission) => void;
  'comm:status': (c: { online: boolean; last_sync: string | null; pending_records: number }) => void;
  'device:health': (h: import('./types').DeviceHealth[]) => void;
  snapshot: (s: Snapshot) => void;
};

export function onLive<K extends keyof LiveEvents>(event: K, cb: LiveEvents[K]) {
  const s = connectSocket();
  s.on(event, cb as never);
  return () => {
    s.off(event, cb as never);
  };
}

export function requestSnapshot() {
  const s = connectSocket();
  s.emit('snapshot:request');
}
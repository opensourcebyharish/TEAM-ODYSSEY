import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastHost, { pushToast } from './Toast';
import { connectSocket, onLive } from '../lib/socket';
import type { Alert } from '../lib/types';

export default function Layout() {
  const location = useLocation();
  const [toasts, setToasts] = useState<{ id: number; severity: string; message: string }[]>([]);

  // Open the socket session and listen for live alerts → toast
  useEffect(() => {
    connectSocket();
    const off = onLive('alert:new', (a: Alert) => {
      pushToast(setToasts, {
        id: Date.now(),
        severity: a.severity,
        message: a.message,
      });
    });
    return () => { off(); };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-abyss-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <div key={location.pathname} className="animate-slide-up mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastHost toasts={toasts} setToasts={setToasts} />
    </div>
  );
}
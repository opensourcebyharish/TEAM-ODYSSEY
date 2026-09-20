import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

// Code-split the heavier pages (Recharts, Leaflet, tables)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LiveMonitoringPage = lazy(() => import('./pages/LiveMonitoringPage'));
const MissionControlPage = lazy(() => import('./pages/MissionControlPage'));
const MapTrackingPage = lazy(() => import('./pages/MapTrackingPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const HistoricalPage = lazy(() => import('./pages/HistoricalPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const DeviceHealthPage = lazy(() => import('./pages/DeviceHealthPage'));
const DataExportPage = lazy(() => import('./pages/DataExportPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageLoader() {
  return (
    <div className="grid h-full place-items-center py-24">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        <span className="text-xs uppercase tracking-widest">Loading…</span>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/live" element={<LiveMonitoringPage />} />
          <Route path="/mission" element={<MissionControlPage />} />
          <Route path="/map" element={<MapTrackingPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/history" element={<HistoricalPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/health" element={<DeviceHealthPage />} />
          <Route path="/export" element={<DataExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
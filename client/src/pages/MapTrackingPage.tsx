import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Circle, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import PageHeader from '../components/PageHeader';
import Badge, { Dot } from '../components/Badge';
import api from '../lib/api';
import { onLive } from '../lib/socket';
import { fmtRelative } from '../lib/format';
import type { Location } from '../lib/types';
import 'leaflet/dist/leaflet.css';

// Custom ODYSSEY marker
const odysseyIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:26px;filter:drop-shadow(0 0 6px rgba(45,212,191,0.9))">🌊</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const iceIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:20px;">🧊</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions as any, { padding: [40, 40] });
    else if (positions.length === 1) map.setView(positions[0], 12);
  }, [positions.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Simulated ice field for the future polar-scenario layer
const ICE_FIELDS: { center: [number, number]; radius: number }[] = [
  { center: [-60.06, 42.61], radius: 0.04 },
  { center: [-60.15, 42.52], radius: 0.05 },
];

export default function MapTrackingPage() {
  const [locs, setLocs] = useState<Location[]>([]);
  const [current, setCurrent] = useState<Location | null>(null);

  useEffect(() => {
    api.get<Location[]>('/locations', { params: { limit: 1000 } }).then((r) => {
      setLocs(r.data);
      if (r.data.length) setCurrent(r.data[r.data.length - 1]);
    }).catch(() => {});
  }, []);

  // Extend the live path with the latest reading position (simulated drift)
  useEffect(() => {
    return onLive('sensor:update', (r) => {
      setCurrent((prev) => {
        const base = prev?.latitude ?? -60.1234;
        const lon = prev?.longitude ?? 42.5678;
        // Tiny drift eastward while underwater
        const next: Location = {
          id: r.id,
          mission_id: r.mission_id ?? 1,
          latitude: Math.round((base + (r.depth ?? 0) * 0.000001) * 1e6) / 1e6,
          longitude: Math.round((lon + 0.00008) * 1e6) / 1e6,
          depth: r.depth,
          speed: r.status === 'DRIFT' ? 0.6 : 0.2,
          timestamp: r.timestamp,
        };
        if (!prev) return next;
        return next;
      });
    });
  }, []);

  const positions = useMemo<[number, number][]>(
    () => [...locs.map((l) => [l.latitude, l.longitude] as [number, number]),
           ...(current ? [[current.latitude, current.longitude] as [number, number]] : [])],
    [locs, current]
  );

  const center: [number, number] = current ? [current.latitude, current.longitude] : [-60.1234, 42.5678];
  const divePoints = useMemo(
    () => locs.filter((l) => l.id % 137 === 0).slice(-4),
    [locs.length] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div>
      <PageHeader title="Map & Tracking" subtitle="Live GNSS trajectory and mission footprint (polar scenario)">
        <Badge tone="ok"><Dot tone="ok" pulse /> TRACKING</Badge>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <div className="card h-[520px] overflow-hidden lg:col-span-2">
          <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Ice regions */}
            {ICE_FIELDS.map((ice, i) => (
              <Circle key={i} center={ice.center} radius={ice.radius * 111000} pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.12, dashArray: '4 4' }}>
                <Tooltip>Possible ice field</Tooltip>
              </Circle>
            ))}
            {/* Trajectory */}
            {positions.length > 1 && (
              <Polyline
                positions={positions}
                pathOptions={{ color: '#2dd4bf', weight: 3, opacity: 0.85 }}
              />
            )}
            {/* Dive markers */}
            {divePoints.map((l, i) => (
              <Marker key={i} position={[l.latitude, l.longitude]}>
                <Tooltip>Dive point</Tooltip>
              </Marker>
            ))}
            {/* Current position */}
            {current && (
              <>
                <Marker position={[current.latitude, current.longitude]} icon={odysseyIcon}>
                  <Popup>
                    <div className="text-xs">
                      <div className="mb-1 font-bold">ODYSSEY-001</div>
                      <div>Lat <span className="data-value">{current.latitude.toFixed(4)}</span></div>
                      <div>Lon <span className="data-value">{current.longitude.toFixed(4)}</span></div>
                      <div>Depth <span className="data-value">{current.depth?.toFixed(1) ?? '—'} m</span></div>
                      <div>Speed <span className="data-value">{current.speed?.toFixed(2) ?? '—'} m/s</span></div>
                    </div>
                  </Popup>
                </Marker>
                <Circle center={[current.latitude, current.longitude]} radius={120} pathOptions={{ color: '#2dd4bf', fillColor: '#2dd4bf', fillOpacity: 0.15 }} />
              </>
            )}
            <FitBounds positions={positions} />
          </MapContainer>
        </div>

        {/* Right column: telemetry + layers */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">GNSS Position</h3>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between rounded-lg bg-abyss-900/60 px-3 py-2">
                <span className="text-slate-400">Latitude</span>
                <span className="data-value text-teal-300">{current ? current.latitude.toFixed(4) : '—'}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-abyss-900/60 px-3 py-2">
                <span className="text-slate-400">Longitude</span>
                <span className="data-value text-teal-300">{current ? current.longitude.toFixed(4) : '—'}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-abyss-900/60 px-3 py-2">
                <span className="text-slate-400">Depth</span>
                <span className="data-value text-cyan-300">{current?.depth != null ? `${current.depth.toFixed(1)} m` : '—'}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-abyss-900/60 px-3 py-2">
                <span className="text-slate-400">Speed</span>
                <span className="data-value text-cyan-300">{current?.speed != null ? `${current.speed.toFixed(2)} m/s` : '—'}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-abyss-900/60 px-3 py-2">
                <span className="text-slate-400">Last update</span>
                <span className="data-value text-slate-200">{fmtRelative(current?.timestamp)}</span>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Map Layers</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2"><span className="text-teal-400">━</span> ODYSSEY trajectory</div>
              <div className="flex items-center gap-2"><Dot tone="ok" /> Current position</div>
              <div className="flex items-center gap-2">⊕ Dive locations</div>
              <div className="flex items-center gap-2"><span style={{ color: '#38bdf8' }}>◯</span> Ice regions</div>
              <div className="flex items-center gap-2 text-slate-500">⛶ Mission boundary (future)</div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">GNSS Status</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Satellite fix</span>
                <Badge tone="ok">LOCKED</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Track points</span>
                <span className="data-value text-slate-200">{locs.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">SPDOP</span>
                <span className="data-value text-slate-200">1.42</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              GNSS acquisition is part of the planned polar system. Track shown from simulated drift + stored location history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
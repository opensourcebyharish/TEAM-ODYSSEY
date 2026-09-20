import { useEffect, useRef, useState } from 'react';
import { onLive, requestSnapshot } from './socket';
import { sensorsApi } from './api';
import type { SensorReading, SensorSummary, Snapshot } from './types';

export interface LiveState {
  latest: SensorReading | null;
  series: SensorReading[];
  summary: SensorSummary | null;
  snapshot: Snapshot | null;
}

/**
 * Subscribe to real-time sensor updates and maintain a rolling series.
 * Falls back to the initial REST snapshot for bootstrapping.
 */
export function useLiveReading(maxPoints = 180): LiveState {
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [summary, setSummary] = useState<SensorSummary | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [series, setSeries] = useState<SensorReading[]>([]);
  const seriesRef = useRef<SensorReading[]>([]);

  // Bootstrap from REST: latest + summary + recent history
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      sensorsApi.latest(),
      sensorsApi.summary(24),
      sensorsApi.history({ limit: maxPoints }),
    ])
      .then(([lat, sum, hist]) => {
        if (cancelled) return;
        setLatest(lat.data);
        setSummary(sum.data);
        const seed = [...hist.data].reverse();
        seriesRef.current = seed;
        setSeries(seed);
      })
      .catch(() => {});

    // Ask the socket layer for a full snapshot too
    requestSnapshot();

    return () => { cancelled = true; };
  }, [maxPoints]);

  // Live updates append to the rolling window
  useEffect(() => {
    const off = onLive('sensor:update', (r: SensorReading) => {
      setLatest(r);
      setSeries((prev) => {
        const next = [...prev, r].slice(-maxPoints);
        seriesRef.current = next;
        return next;
      });
    });
    const offSnap = onLive('snapshot', (s: Snapshot) => {
      setSnapshot(s);
      if (!latest && s.latest) {
        setLatest(s.latest);
        seriesRef.current = s.readings;
        setSeries(s.readings);
      }
    });
    return () => { off(); offSnap(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPoints]);

  return { latest, series, summary, snapshot };
}
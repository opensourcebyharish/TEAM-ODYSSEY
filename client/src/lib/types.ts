// Shared ODYSSEY domain types

export type Role = 'admin' | 'researcher' | 'operator' | 'viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
}

export interface SensorReading {
  id: number;
  device_id: string;
  timestamp: string;
  temperature: number | null;
  pressure: number | null;
  depth: number | null;
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  gyro_x: number | null;
  gyro_y: number | null;
  gyro_z: number | null;
  battery: number | null;
  status: string | null;
  mission_id: number | null;
}

export type MissionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'aborted';
export type MissionPhase = 'IDLE' | 'DIVE' | 'DRIFT' | 'SENSE' | 'DECIDE' | 'SURFACE' | 'TRANSMIT' | 'PAUSED';

export interface Mission {
  id: number;
  name: string;
  description: string | null;
  status: MissionStatus;
  current_phase: MissionPhase;
  start_time: string | null;
  end_time: string | null;
  sampling_interval: number;
  max_depth: number;
  duration_hours: number;
  surface_interval: number;
  comm_interval: number;
  created_by: number | null;
  created_by_name?: string;
  created_at: string;
  data_points?: number;
  elapsed_seconds?: number;
}

export interface Alert {
  id: number;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  sensor_value: number | null;
  threshold: number | null;
  acknowledged: number;
  acknowledged_by: number | null;
  acked_by_name?: string;
  acknowledged_at: string | null;
  timestamp: string;
}

export interface SystemEvent {
  id: number;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  source: string | null;
  timestamp: string;
}

export interface DeviceHealth {
  id: number;
  device_id: string;
  component: string;
  status: string;
  value: string | null;
  checked_at: string;
}

export interface Device {
  id: number;
  device_name: string;
  device_id: string;
  firmware_version: string;
  status: string;
  last_seen: string | null;
  reading_count?: number;
  last_reading?: string | null;
}

export interface CommStatus {
  online: boolean;
  last_sync: string | null;
  pending_records: number;
  synced_records: number;
  auto_sync: boolean;
}

export interface SensorSummary {
  samples: number;
  temp_min: number;
  temp_max: number;
  temp_avg: number;
  press_min: number;
  press_max: number;
  press_avg: number;
  depth_min: number;
  depth_max: number;
  depth_avg: number;
  accel_z_avg: number;
  battery_avg: number;
}

export interface Location {
  id: number;
  mission_id: number;
  latitude: number;
  longitude: number;
  depth: number | null;
  speed: number | null;
  timestamp: string;
}

export interface Snapshot {
  latest: SensorReading | null;
  mission: Mission | null;
  readings: SensorReading[];
  unacked_alerts: Alert[];
  events: SystemEvent[];
  ts: string;
}

export interface Settings {
  temperature_min: string;
  temperature_max: string;
  pressure_max: string;
  battery_critical: string;
  battery_warning: string;
  sampling_interval: string;
  sim_enabled?: string;
}
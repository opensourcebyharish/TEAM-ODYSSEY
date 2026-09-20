-- SOREX Database Schema
-- Southern Ocean Robotic Explorer — Mission Control

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─── Users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('admin', 'researcher', 'operator', 'viewer')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Devices ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  device_name      TEXT NOT NULL,
  device_id        TEXT NOT NULL UNIQUE,
  firmware_version TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'online'
                     CHECK (status IN ('online', 'offline', 'maintenance', 'error')),
  last_seen        TEXT
);

-- ─── Missions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'idle'
                      CHECK (status IN ('idle', 'running', 'paused', 'completed', 'aborted')),
  current_phase     TEXT NOT NULL DEFAULT 'IDLE'
                      CHECK (current_phase IN ('IDLE', 'DIVE', 'DRIFT', 'SENSE', 'DECIDE', 'SURFACE', 'TRANSMIT', 'PAUSED')),
  start_time        TEXT,
  end_time          TEXT,
  sampling_interval INTEGER NOT NULL DEFAULT 10,
  max_depth         REAL    NOT NULL DEFAULT 100,
  duration_hours    REAL    NOT NULL DEFAULT 24,
  surface_interval  INTEGER NOT NULL DEFAULT 30,
  comm_interval     INTEGER NOT NULL DEFAULT 5,
  created_by        INTEGER REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Sensor readings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_readings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
  temperature REAL,
  pressure    REAL,
  depth       REAL,
  accel_x     REAL,
  accel_y     REAL,
  accel_z     REAL,
  gyro_x      REAL,
  gyro_y      REAL,
  gyro_z      REAL,
  battery     REAL,
  status      TEXT,
  mission_id  INTEGER REFERENCES missions(id)
);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON sensor_readings (timestamp);
CREATE INDEX IF NOT EXISTS idx_readings_mission  ON sensor_readings (mission_id);

-- ─── Locations (GNSS / future) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id INTEGER REFERENCES missions(id),
  latitude   REAL NOT NULL,
  longitude  REAL NOT NULL,
  depth      REAL,
  speed      REAL,
  timestamp  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Alerts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type       TEXT NOT NULL,
  severity         TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message          TEXT NOT NULL,
  sensor_value     REAL,
  threshold        REAL,
  acknowledged     INTEGER NOT NULL DEFAULT 0,
  acknowledged_by  INTEGER REFERENCES users(id),
  acknowledged_at  TEXT,
  timestamp        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts (acknowledged);

-- ─── System events log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  severity   TEXT NOT NULL DEFAULT 'info'
               CHECK (severity IN ('info', 'warning', 'critical')),
  message    TEXT NOT NULL,
  source     TEXT,
  timestamp  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON system_events (timestamp);

-- ─── Device health ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_health (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  component   TEXT NOT NULL,
  status      TEXT NOT NULL,
  value       TEXT,
  checked_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key          TEXT PRIMARY KEY,
  value        TEXT,
  description  TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Pending sync (offline buffering) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_sync (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  payload     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  synced      INTEGER NOT NULL DEFAULT 0,
  synced_at   TEXT
);
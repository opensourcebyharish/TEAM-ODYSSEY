const bcrypt = require('bcryptjs');
const { db, insert } = require('./db');

// Deterministic pseudo-random generator (mulberry32) so seeds are reproducible.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clearTables() {
  const tables = [
    'pending_sync', 'settings', 'device_health', 'system_events', 'alerts',
    'locations', 'sensor_readings', 'missions', 'devices', 'users',
  ];
  for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();
  try { db.prepare('DELETE FROM sqlite_sequence').run(); } catch (_) {}
  console.log('Cleared existing data.');
}

const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;

function iso(offsetMs) {
  return new Date(NOW.getTime() - offsetMs).toISOString();
}

async function seed() {
  clearTables();

  // ── Users ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('odyssey2026', 10);
  const users = [
    { username: 'admin', email: 'admin@odyssey.io', password_hash: adminHash, role: 'admin', created_at: iso(30 * DAY_MS) },
    { username: 'researcher1', email: 'maria@odyssey.io', password_hash: adminHash, role: 'researcher', created_at: iso(28 * DAY_MS) },
    { username: 'op1', email: 'james@odyssey.io', password_hash: adminHash, role: 'operator', created_at: iso(25 * DAY_MS) },
    { username: 'viewer1', email: 'guest@odyssey.io', password_hash: adminHash, role: 'viewer', created_at: iso(20 * DAY_MS) },
  ];
  const uIds = [];
  for (const u of users) uIds.push(insert('users', u));
  console.log('Users seeded (admin / odyssey2026).');

  // ── Device ─────────────────────────────────────────────────────────────
  insert('devices', {
    device_name: 'ODYSSEY Prototype 01',
    device_id: 'ODYSSEY-001',
    firmware_version: '0.4.2-beta',
    status: 'online',
    last_seen: NOW.toISOString(),
  });
  insert('devices', {
    device_name: 'ODYSSEY Polar Prototype',
    device_id: 'ODYSSEY-002',
    firmware_version: '0.1.0-dev',
    status: 'offline',
    last_seen: iso(6 * DAY_MS),
  });

  // ── Missions ───────────────────────────────────────────────────────────
  const m1 = insert('missions', {
    name: 'POLAR OBSERVATION — TEST 01',
    description: 'First integrated surface-to-depth observation run near the ice edge.',
    status: 'running',
    current_phase: 'SENSE',
    start_time: iso(3 * 60 * 60 * 1000),
    sampling_interval: 10,
    max_depth: 100,
    duration_hours: 24,
    surface_interval: 30,
    comm_interval: 5,
    created_by: uIds[0],
    created_at: iso(4 * 60 * 60 * 1000),
  });
  const m2 = insert('missions', {
    name: 'THERMOCLINE MAPPING — RAPTOR',
    description: 'Temperature gradient survey across the shelf break.',
    status: 'completed',
    current_phase: 'TRANSMIT',
    start_time: iso(6 * DAY_MS),
    end_time: iso(5 * DAY_MS),
    sampling_interval: 20,
    max_depth: 60,
    duration_hours: 18,
    surface_interval: 45,
    comm_interval: 15,
    created_by: uIds[1] || uIds[0],
    created_at: iso(7 * DAY_MS),
  });

  // ── Historical sensor readings (last 24h @ 10s) ────────────────────────
  const rnd = mulberry32(20260910);
  // Simulate a dive/float cycle with slowly varying temperature & pressure.
  let baseTemp = -1.2;
  let depth = 4;
  const readings = [];
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const t = iso((N - i) * 10 * 1000);
    // gentle sine motion through the mission
    const ph = i / N * Math.PI * 2 * 3;
    depth = 8 + Math.abs(Math.sin(ph)) * 55 + (rnd() - 0.5) * 3;
    const pressure = 1013.25 + depth * 0.0981 + (rnd() - 0.5) * 2.2;
    baseTemp = -0.6 - Math.abs(Math.sin(ph)) * 1.6 + (rnd() - 0.5) * 0.4;
    const tilt = (rnd() - 0.5) * 0.06;
    const reading = {
      device_id: 'ODYSSEY-001',
      timestamp: t,
      temperature: Math.round(baseTemp * 100) / 100,
      pressure: Math.round(pressure * 10) / 10,
      depth: Math.round(depth * 10) / 10,
      accel_x: Math.round(tilt * 100) / 100,
      accel_y: Math.round((rnd() - 0.5) * 0.06 * 100) / 100,
      accel_z: Math.round((0.98 + (rnd() - 0.5) * 0.015) * 100) / 100,
      gyro_x: Math.round((rnd() - 0.5) * 2 * 100) / 100,
      gyro_y: Math.round((rnd() - 0.5) * 2 * 100) / 100,
      gyro_z: Math.round((rnd() - 0.5) * 2 * 100) / 100,
      battery: Math.round(88 - (i / N) * 6),
      status: depth < 15 ? 'DRIFT' : 'SENSE',
      mission_id: m1,
    };
    readings.push(reading);
  }
  const ins = db.prepare(`INSERT INTO sensor_readings
    (device_id, timestamp, temperature, pressure, depth, accel_x, accel_y, accel_z,
     gyro_x, gyro_y, gyro_z, battery, status, mission_id)
    VALUES (@device_id, @timestamp, @temperature, @pressure, @depth, @accel_x, @accel_y, @accel_z,
     @gyro_x, @gyro_y, @gyro_z, @battery, @status, @mission_id)`);
  db.exec('BEGIN');
  for (const r of readings) ins.run({
    '@device_id': r.device_id, '@timestamp': r.timestamp, '@temperature': r.temperature,
    '@pressure': r.pressure, '@depth': r.depth, '@accel_x': r.accel_x, '@accel_y': r.accel_y,
    '@accel_z': r.accel_z, '@gyro_x': r.gyro_x, '@gyro_y': r.gyro_y, '@gyro_z': r.gyro_z,
    '@battery': r.battery, '@status': r.status, '@mission_id': r.mission_id,
  });
  db.exec('COMMIT');
  console.log(`Seeded ${N} historical sensor readings.`);

  // ── Locations (trajectory for the map) ─────────────────────────────────
  const latRnd = mulberry32(42);
  let lat = -60.1234, lon = 42.5678;
  const locs = [];
  for (let i = 0; i < 400; i++) {
    const t = iso((N - i * 5) * 10 * 1000);
    lat += (latRnd() - 0.5) * 0.002;
    lon += (latRnd() - 0.5) * 0.002;
    locs.push({
      mission_id: m1,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      depth: Math.round((8 + Math.abs(Math.sin(i / 400 * Math.PI * 2 * 3)) * 45) * 10) / 10,
      speed: Math.round((latRnd() * 0.8) * 100) / 100,
      timestamp: t,
    });
  }
  const locIns = db.prepare(`INSERT INTO locations
    (mission_id, latitude, longitude, depth, speed, timestamp)
    VALUES (@mission_id, @latitude, @longitude, @depth, @speed, @timestamp)`);
  db.exec('BEGIN');
  for (const l of locs) locIns.run({
    '@mission_id': l.mission_id, '@latitude': l.latitude, '@longitude': l.longitude,
    '@depth': l.depth, '@speed': l.speed, '@timestamp': l.timestamp,
  });
  db.exec('COMMIT');
  console.log('Seeded trajectory locations.');

  // ── Alerts ─────────────────────────────────────────────────────────────
  const seedAlerts = [
    { alert_type: 'communication', severity: 'info', message: 'Wi-Fi signal weak — RSSI below -75 dBm.', sensor_value: -78, threshold: -75, acknowledged: 1, ts: iso(4 * 60 * 1000) },
    { alert_type: 'temperature', severity: 'warning', message: 'Temperature below warning threshold.', sensor_value: -5.2, threshold: -4.0, acknowledged: 0, ts: iso(22 * 60 * 1000) },
    { alert_type: 'pressure', severity: 'info', message: 'Pressure returning to normal.', sensor_value: 1014.2, threshold: 1010, acknowledged: 1, ts: iso(50 * 60 * 1000) },
    { alert_type: 'battery', severity: 'warning', message: 'Battery below 30%. Power-saving mode suggested.', sensor_value: 29, threshold: 30, acknowledged: 0, ts: iso(3 * 60 * 1000) },
    { alert_type: 'battery', severity: 'critical', message: 'Critical battery level — surface recommended.', sensor_value: 12, threshold: 15, acknowledged: 0, ts: iso(80 * 60 * 1000) },
    { alert_type: 'communication', severity: 'info', message: 'Communication restored after link loss.', sensor_value: null, threshold: null, acknowledged: 1, ts: iso(2 * 60 * 1000) },
  ];
  for (const a of seedAlerts) {
    insert('alerts', {
      alert_type: a.alert_type, severity: a.severity, message: a.message,
      sensor_value: a.sensor_value, threshold: a.threshold,
      acknowledged: a.acknowledged, acknowledged_by: a.acknowledged ? 1 : null,
      acknowledged_at: a.acknowledged ? NOW.toISOString() : null,
      timestamp: a.ts,
    });
  }
  console.log('Seeded alerts.');

  // ── System events ──────────────────────────────────────────────────────
  const events = [
    ['system_start', 'ODYSSEY Mission Control server started.', 'info', 'system'],
    ['acquisition', 'Sensor acquisition started on ODYSSEY-001.', 'info', 'stm32'],
    ['sensor', 'Temperature = -1.8 °C', 'info', 'ds18b20'],
    ['sensor', 'Pressure = 1012.4 hPa', 'info', 'bmp180'],
    ['storage', 'Data written to MicroSD.', 'info', 'storage'],
    ['comm', 'Data transmitted over Wi-Fi.', 'info', 'esp8266'],
    ['comm', 'Wi-Fi signal weak.', 'warning', 'esp8266'],
    ['comm', 'Communication restored.', 'info', 'esp8266'],
    ['mission', 'Mission POLAR OBSERVATION — TEST 01 started.', 'info', 'mission'],
    ['mission', 'Phase transition: DIVE → DRIFT.', 'info', 'mission'],
    ['mission', 'Phase transition: DRIFT → SENSE.', 'info', 'mission'],
    ['health', 'MPU6050 self-test passed.', 'info', 'sensor'],
  ];
  events.forEach((e, i) => {
    insert('system_events', {
      event_type: e[0], message: e[1], severity: e[2], source: e[3],
      timestamp: iso((events.length - i) * 2 * 60 * 1000),
    });
  });
  console.log('Seeded system events.');

  // ── Device health ──────────────────────────────────────────────────────
  const health = [
    ['ODYSSEY-001', 'STM32', 'online', 'ok'],
    ['ODYSSEY-001', 'ESP8266', 'online', 'RSSI -62 dBm'],
    ['ODYSSEY-001', 'DS18B20', 'normal', 'temp_sensor'],
    ['ODYSSEY-001', 'BMP180', 'normal', 'pressure_sensor'],
    ['ODYSSEY-001', 'MPU6050', 'normal', 'imu'],
    ['ODYSSEY-001', 'DS1307', 'normal', 'rtc'],
    ['ODYSSEY-001', 'MicroSD', 'normal', '72% free'],
    ['ODYSSEY-001', 'Battery', 'normal', '87%'],
    ['ODYSSEY-001', 'Memory', 'normal', '61% used'],
  ];
  for (const h of health) {
    insert('device_health', {
      device_id: h[0], component: h[1], status: h[2], value: h[3], checked_at: NOW.toISOString(),
    });
  }
  console.log('Seeded device health.');

  // ── Settings ───────────────────────────────────────────────────────────
  const settings = [
    ['temperature_min', '-4.0', 'Minimum temperature before warning.'],
    ['temperature_max', '2.0', 'Maximum temperature before warning.'],
    ['pressure_max', '1100', 'Maximum pressure before warning.'],
    ['battery_critical', '15', 'Critical battery level.'],
    ['battery_warning', '30', 'Battery warning level.'],
    ['sampling_interval', '10', 'Default sensor sampling interval (seconds).'],
    ['sim_enabled', 'true', 'Whether the sensor simulator runs.'],
  ];
  for (const s of settings) insert('settings', { key: s[0], value: s[1], description: s[2] });
  console.log('Seeded settings.');

  console.log('\n✔ Seed complete. Database ready at server/data/odyssey.db');

  // Close cleanly so better-sqlite3 statements finalize before process exit
  db.close();
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
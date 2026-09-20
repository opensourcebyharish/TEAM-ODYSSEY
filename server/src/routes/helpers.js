const { getRow } = require('../database/db');
const { db: rawDb } = require('../database/db');

/**
 * Insert a sensor reading row. Returns the new row id.
 * Also runs the alert engine against the reading.
 */
function insertReading(data) {
  const stmt = rawDb.prepare(`INSERT INTO sensor_readings
    (device_id, timestamp, temperature, pressure, depth, accel_x, accel_y, accel_z,
     gyro_x, gyro_y, gyro_z, battery, status, mission_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(
    data.device_id, data.timestamp, data.temperature, data.pressure, data.depth,
    data.accel_x, data.accel_y, data.accel_z, data.gyro_x, data.gyro_y, data.gyro_z,
    data.battery, data.status, data.mission_id
  );
  const id = info.lastInsertRowid;
  runAlertChecks(data);
  return id;
}

/**
 * Alerts table insert (dup-safe) helper.
 */
function insertAlert(fields) {
  const cols = Object.keys(fields);
  const sql = `INSERT INTO alerts (${cols.join(', ')})
               VALUES (${cols.map(() => '?').join(', ')})`;
  return rawDb.prepare(sql).run(...cols.map((c) => fields[c])).lastInsertRowid;
}

/**
 * Alert engine — evaluate thresholds against the latest reading.
 * Fires once per condition until the alert is acknowledged.
 */
function runAlertChecks(reading) {
  const settings = loadSettings();
  const checks = [
    {
      type: 'temperature',
      active: () => reading.temperature != null && (
        reading.temperature < parseFloat(settings.temperature_min ?? '-4') ||
        reading.temperature > parseFloat(settings.temperature_max ?? '2')
      ),
      message: `Temperature out of range: ${reading.temperature} °C`,
      severity: 'warning',
      sensor_value: reading.temperature,
      threshold: reading.temperature < parseFloat(settings.temperature_min ?? '-4')
        ? parseFloat(settings.temperature_min ?? '-4') : parseFloat(settings.temperature_max ?? '2'),
    },
    {
      type: 'pressure',
      active: () => reading.pressure != null && reading.pressure > parseFloat(settings.pressure_max ?? '1100'),
      message: `Pressure limit exceeded: ${reading.pressure} hPa`,
      severity: 'warning',
      sensor_value: reading.pressure,
      threshold: parseFloat(settings.pressure_max ?? '1100'),
    },
    {
      type: 'battery',
      active: () => reading.battery != null && reading.battery <= parseFloat(settings.battery_critical ?? '15'),
      message: `CRITICAL BATTERY: ${reading.battery}%. Surface / power-saving mode recommended.`,
      severity: 'critical',
      sensor_value: reading.battery,
      threshold: parseFloat(settings.battery_critical ?? '15'),
    },
    {
      type: 'battery',
      active: () => reading.battery != null &&
        reading.battery <= parseFloat(settings.battery_warning ?? '30') &&
        reading.battery > parseFloat(settings.battery_critical ?? '15'),
      message: `Battery low: ${reading.battery}%. Power-saving mode suggested.`,
      severity: 'warning',
      sensor_value: reading.battery,
      threshold: parseFloat(settings.battery_warning ?? '30'),
    },
  ];

  for (const check of checks) {
    if (!check.active()) continue;
    // Skip if an identical active alert already exists
    const existing = getRow(
      `SELECT id FROM alerts
       WHERE alert_type = ? AND acknowledged = 0
         AND message = ? ORDER BY id DESC LIMIT 1`,
      [check.type, check.message]
    );
    if (existing) continue;
    insertAlert({
      alert_type: check.type,
      severity: check.severity,
      message: check.message,
      sensor_value: check.sensor_value,
      threshold: check.threshold,
      acknowledged: 0,
      timestamp: reading.timestamp || new Date().toISOString(),
    });
  }
}

/**
 * Load all app settings into a flat object.
 */
function loadSettings() {
  const rows = rawDb.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

module.exports = { insertReading, insertAlert, loadSettings };
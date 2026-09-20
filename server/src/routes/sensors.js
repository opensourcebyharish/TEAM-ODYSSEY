const express = require('express');
const { runQuery, getRow } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/sensors/latest — most recent reading for (optional) device
router.get('/latest', (req, res) => {
  const deviceId = req.query.device || 'ODYSSEY-001';
  const row = getRow(
    `SELECT * FROM sensor_readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [deviceId]
  );
  if (!row) return res.status(404).json({ error: 'No readings yet' });
  res.json(row);
});

// GET /api/sensors/latest-all — latest per device
router.get('/latest-all', (req, res) => {
  const rows = runQuery(
    `SELECT r.* FROM sensor_readings r
     JOIN (SELECT device_id, MAX(timestamp) t FROM sensor_readings GROUP BY device_id) m
       ON r.device_id = m.device_id AND r.timestamp = m.t`
  );
  res.json(rows);
});

// GET /api/sensors/history?from=&to=&limit=&device=
router.get('/history', (req, res) => {
  const deviceId = req.query.device || 'ODYSSEY-001';
  const limit = Math.min(parseInt(req.query.limit || '500', 10), 2000);
  const from = req.query.from;
  const to = req.query.to;

  let sql = `SELECT * FROM sensor_readings WHERE device_id = ?`;
  const params = [deviceId];
  if (from) { sql += ` AND timestamp >= ?`; params.push(from); }
  if (to) { sql += ` AND timestamp <= ?`; params.push(to); }
  sql += ` ORDER BY timestamp DESC LIMIT ?`;
  params.push(limit);

  res.json(runQuery(sql, params));
});

// GET /api/sensors/summary — min/max/avg over a window
router.get('/summary', (req, res) => {
  const deviceId = req.query.device || 'ODYSSEY-001';
  const hours = parseFloat(req.query.hours || '24');
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const row = getRow(
    `SELECT COUNT(*) as samples,
            ROUND(MIN(temperature),2) temp_min, ROUND(MAX(temperature),2) temp_max,
            ROUND(AVG(temperature),2) temp_avg,
            ROUND(MIN(pressure),1) press_min, ROUND(MAX(pressure),1) press_max,
            ROUND(AVG(pressure),1) press_avg,
            ROUND(MIN(depth),1) depth_min, ROUND(MAX(depth),1) depth_max,
            ROUND(AVG(depth),1) depth_avg,
            ROUND(AVG(accel_z),3) accel_z_avg,
            ROUND(AVG(battery),1) battery_avg
     FROM sensor_readings WHERE device_id = ? AND timestamp >= ?`,
    [deviceId, since]
  );
  res.json(row);
});

// POST /api/sensors/data — ingest a reading (STM32 → ESP8266 → backend)
router.post('/data', (req, res) => {
  const d = req.body || {};
  const requireNum = (v) => (typeof v === 'number' && !Number.isNaN(v)) ? v : null;
  try {
    const id = require('./helpers').insertReading({
      device_id: d.device_id || 'ODYSSEY-001',
      timestamp: d.timestamp || new Date().toISOString(),
      temperature: requireNum(d.temperature),
      pressure: requireNum(d.pressure),
      depth: requireNum(d.depth),
      accel_x: requireNum(d.accel_x), accel_y: requireNum(d.accel_y), accel_z: requireNum(d.accel_z),
      gyro_x: requireNum(d.gyro_x), gyro_y: requireNum(d.gyro_y), gyro_z: requireNum(d.gyro_z),
      battery: requireNum(d.battery),
      status: d.status || null,
      mission_id: d.mission_id || null,
    });
    res.status(201).json({ id, received: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to store reading', detail: e.message });
  }
});

module.exports = router;
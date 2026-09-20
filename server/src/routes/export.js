const express = require('express');
const { runQuery, getRow } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const EXPORT_COLUMNS = [
  'id', 'timestamp', 'temperature', 'pressure', 'depth',
  'accel_x', 'accel_y', 'accel_z', 'gyro_x', 'gyro_y', 'gyro_z',
  'battery', 'status', 'mission_id',
];

function buildFetch(req) {
  const deviceId = req.query.device || 'ODYSSEY-001';
  const missionId = req.query.mission;
  const limit = Math.min(parseInt(req.query.limit || '10000', 10), 50000);
  let sql = `SELECT * FROM sensor_readings WHERE 1=1`;
  const params = [];
  if (deviceId) { sql += ' AND device_id = ?'; params.push(deviceId); }
  if (missionId) { sql += ' AND mission_id = ?'; params.push(missionId); }
  if (req.query.from) { sql += ' AND timestamp >= ?'; params.push(req.query.from); }
  if (req.query.to) { sql += ' AND timestamp <= ?'; params.push(req.query.to); }
  sql += ' ORDER BY timestamp ASC LIMIT ?';
  params.push(limit);
  return { sql, params };
}

function toCsv(rows) {
  const header = EXPORT_COLUMNS.join(',');
  const lines = rows.map((r) =>
    EXPORT_COLUMNS.map((c) => {
      const v = r[c];
      if (v === null || v === undefined) return '';
      return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

// GET /api/data/export/csv
router.get('/csv', (req, res) => {
  const { sql, params } = buildFetch(req);
  const rows = runQuery(sql, params);
  const count = getRow('SELECT COUNT(*) c FROM sensor_readings');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="odyssey-export-${Date.now()}.csv"`);
  res.send(toCsv(rows));
});

// GET /api/data/export/json
router.get('/json', (req, res) => {
  const { sql, params } = buildFetch(req);
  const rows = runQuery(sql, params);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="odyssey-export-${Date.now()}.json"`);
  res.send(JSON.stringify(rows, null, 2));
});

// GET /api/data/export/pending — unsynced records (MicroSD buffer simulation)
router.get('/pending', authenticate, (req, res) => {
  const rows = runQuery(`SELECT * FROM pending_sync WHERE synced = 0 ORDER BY created_at LIMIT 500`);
  res.json(rows);
});

// GET /api/data/export/meta — dataset stats
router.get('/meta', (req, res) => {
  const totals = getRow(`SELECT COUNT(*) readings, COUNT(DISTINCT device_id) devices,
    MIN(timestamp) earliest, MAX(timestamp) latest FROM sensor_readings`);
  res.json(totals);
});

module.exports = router;
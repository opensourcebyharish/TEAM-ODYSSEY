const express = require('express');
const { runQuery, getRow, insert, logEvent } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/device/status — all devices + their last seen
router.get('/status', (req, res) => {
  res.json(runQuery(`SELECT d.*,
    (SELECT COUNT(*) FROM sensor_readings r WHERE r.device_id = d.device_id) as reading_count,
    (SELECT timestamp FROM sensor_readings r WHERE r.device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as last_reading
    FROM devices d ORDER BY d.id`));
});

// GET /api/device/health — device health records (latest per component)
router.get('/health', (req, res) => {
  const deviceId = req.query.device || 'ODYSSEY-001';
  const rows = runQuery(
    `SELECT h.* FROM device_health h
     JOIN (SELECT component, MAX(checked_at) c FROM device_health
           WHERE device_id = ? GROUP BY component) m
       ON h.component = m.component AND h.checked_at = m.c
     WHERE h.device_id = ? ORDER BY h.id`, [deviceId, deviceId]
  );
  res.json(rows);
});

// GET /api/device/:id — single device
router.get('/:deviceId', (req, res) => {
  const d = getRow('SELECT * FROM devices WHERE device_id = ? OR id = ?', [req.params.deviceId, req.params.deviceId]);
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json(d);
});

// POST /api/device/:deviceId/health — update component health (device→backend)
router.post('/:deviceId/health', (req, res) => {
  const { component, status, value } = req.body || {};
  if (!component || !status) return res.status(400).json({ error: 'component and status required' });
  insert('device_health', {
    device_id: req.params.deviceId, component, status: String(status),
    value: value != null ? String(value) : null, checked_at: new Date().toISOString(),
  });
  res.status(201).json({ received: true });
});

// GET /api/device/comm/status — communication + sync summary
router.get('/comm/status', (req, res) => {
  const deviceId = req.query.device || 'ODYSSEY-001';
  const lastReading = getRow(
    `SELECT MAX(timestamp) t FROM sensor_readings WHERE device_id = ?`, [deviceId]
  );
  const pending = getRow(
    `SELECT COUNT(*) c FROM pending_sync WHERE synced = 0`
  ).c;
  const toSync = getRow(`SELECT COUNT(*) c FROM pending_sync`).c;
  const online = lastReading &&
    (Date.now() - new Date(lastReading.t).getTime()) < 30 * 1000;
  res.json({
    online: !!online,
    last_sync: lastReading ? lastReading.t : null,
    pending_records: pending,
    synced_records: toSync - pending,
    auto_sync: true,
  });
});

module.exports = router;
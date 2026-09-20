const express = require('express');
const { runQuery, getRow, insert } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/locations?mission=&limit=
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '500', 10), 2000);
  let sql = `SELECT * FROM locations WHERE 1=1`;
  const params = [];
  if (req.query.mission) { sql += ' AND mission_id = ?'; params.push(req.query.mission); }
  sql += ` ORDER BY timestamp ASC LIMIT ?`;
  params.push(limit);
  res.json(runQuery(sql, params));
});

// GET /api/location/current — the most recent known position
router.get('/current', (req, res) => {
  const row = getRow(`SELECT * FROM locations ORDER BY timestamp DESC LIMIT 1`);
  if (!row) return res.status(404).json({ error: 'No location yet' });
  res.json(row);
});

// POST /api/location — device reports its position (future GNSS)
router.post('/', (req, res) => {
  const b = req.body || {};
  if (b.latitude == null || b.longitude == null) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }
  const id = insert('locations', {
    mission_id: b.mission_id || null,
    latitude: b.latitude,
    longitude: b.longitude,
    depth: b.depth ?? null,
    speed: b.speed ?? null,
    timestamp: b.timestamp || new Date().toISOString(),
  });
  res.status(201).json({ id });
});

module.exports = router;
const express = require('express');
const { runQuery } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/system/events?severity=&limit=&source=
router.get('/', (req, res) => {
  let sql = `SELECT * FROM system_events WHERE 1=1`;
  const params = [];
  if (req.query.severity) { sql += ' AND severity = ?'; params.push(req.query.severity); }
  if (req.query.source) { sql += ' AND source = ?'; params.push(req.query.source); }
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
  sql += ` ORDER BY timestamp DESC, id DESC LIMIT ?`;
  params.push(limit);
  res.json(runQuery(sql, params));
});

module.exports = router;
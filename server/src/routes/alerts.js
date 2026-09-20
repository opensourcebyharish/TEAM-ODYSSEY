const express = require('express');
const { runQuery, getRow, logEvent } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/alerts?severity=&acknowledged=&limit=
router.get('/', (req, res) => {
  let sql = `SELECT a.*, u.username as acked_by_name FROM alerts a
             LEFT JOIN users u ON a.acknowledged_by = u.id WHERE 1=1`;
  const params = [];
  if (req.query.severity) { sql += ' AND a.severity = ?'; params.push(req.query.severity); }
  if (req.query.acknowledged !== undefined) { sql += ' AND a.acknowledged = ?'; params.push(Number(req.query.acknowledged)); }
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
  sql += ` ORDER BY a.timestamp DESC LIMIT ?`;
  params.push(limit);
  res.json(runQuery(sql, params));
});

// GET /api/alerts/stats — counts by severity / unacknowledged
router.get('/stats', (req, res) => {
  const severityRows = runQuery(`SELECT severity, COUNT(*) c FROM alerts GROUP BY severity`);
  const unacked = getRow(`SELECT COUNT(*) c FROM alerts WHERE acknowledged = 0`).c;
  res.json({
    total: severityRows.reduce((s, r) => s + r.c, 0),
    unacknowledged: unacked,
    by_severity: Object.fromEntries(severityRows.map((r) => [r.severity, r.c])),
  });
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', requireRole('admin', 'operator', 'researcher'), (req, res) => {
  const alert = getRow('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  runQuery(`UPDATE alerts SET acknowledged=1, acknowledged_by=?, acknowledged_at=?
            WHERE id=?`, [req.user.id, new Date().toISOString(), alert.id]);
  logEvent('alert', `Alert #${alert.id} acknowledged by ${req.user.username}.`, 'info', 'alert');
  res.json(getRow('SELECT * FROM alerts WHERE id = ?', [alert.id]));
});

// POST /api/alerts/acknowledge-all
router.post('/acknowledge-all', requireRole('admin', 'operator', 'researcher'), (req, res) => {
  const info = runQuery(`UPDATE alerts SET acknowledged=1, acknowledged_by=?, acknowledged_at=?
                         WHERE acknowledged=0`, [req.user.id, new Date().toISOString()]);
  res.json({ acknowledged: info.changes });
});

module.exports = router;
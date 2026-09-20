const express = require('express');
const { runQuery, getRow, insert, logEvent } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Get latest active mission (running/paused), else most recent
function activeMission() {
  return (
    getRow(`SELECT * FROM missions WHERE status IN ('running','paused') ORDER BY start_time DESC LIMIT 1`) ||
    getRow(`SELECT * FROM missions ORDER BY COALESCE(start_time, created_at) DESC LIMIT 1`)
  );
}

// GET /api/missions — list all
router.get('/', (req, res) => {
  res.json(runQuery(`SELECT m.*, u.username as created_by_name
                     FROM missions m LEFT JOIN users u ON m.created_by = u.id
                     ORDER BY COALESCE(m.start_time, m.created_at) DESC LIMIT 50`));
});

// GET /api/mission/current — active mission + data point count + elapsed
router.get('/current', (req, res) => {
  const mission = activeMission();
  if (!mission) return res.status(404).json({ error: 'No mission found' });
  const count = getRow(`SELECT COUNT(*) c FROM sensor_readings WHERE mission_id = ?`, [mission.id]);
  let elapsed = null;
  if (mission.start_time) {
    const end = mission.end_time || new Date().toISOString();
    elapsed = (new Date(end).getTime() - new Date(mission.start_time).getTime()) / 1000;
  }
  res.json({ ...mission, data_points: count.c, elapsed_seconds: Math.max(0, elapsed || 0) });
});

// GET /api/missions/:id
router.get('/:id', (req, res) => {
  const m = getRow('SELECT * FROM missions WHERE id = ?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Mission not found' });
  res.json(m);
});

// POST /api/missions — create mission (operator/researcher/admin)
router.post('/', requireRole('admin', 'operator', 'researcher'), (req, res) => {
  const b = req.body || {};
  const now = new Date().toISOString();
  const id = insert('missions', {
    name: b.name || 'UNTITLED MISSION',
    description: b.description || null,
    status: 'idle',
    current_phase: 'IDLE',
    sampling_interval: b.sampling_interval || 10,
    max_depth: b.max_depth ?? 100,
    duration_hours: b.duration_hours ?? 24,
    surface_interval: b.surface_interval ?? 30,
    comm_interval: b.comm_interval ?? 5,
    created_by: req.user.id,
    created_at: now,
  });
  logEvent('mission', `Mission "${b.name || 'UNTITLED MISSION'}" created.`, 'info', 'mission');
  res.status(201).json(getRow('SELECT * FROM missions WHERE id = ?', [id]));
});

// POST /api/mission/start
router.post('/start', requireRole('admin', 'operator'), (req, res) => {
  const existing = getRow(`SELECT * FROM missions WHERE status IN ('running','paused') LIMIT 1`);
  if (existing) {
    return res.status(409).json({ error: 'A mission is already active — pause or abort it first.', mission: existing });
  }
  const target = req.body && req.body.id
    ? getRow('SELECT * FROM missions WHERE id = ?', [req.body.id])
    : getRow(`SELECT * FROM missions WHERE status = 'idle' OR status = 'completed' ORDER BY id DESC LIMIT 1`);
  if (!target) return res.status(404).json({ error: 'No mission to start. Create one first.' });
  const now = new Date().toISOString();
  runQuery(`UPDATE missions SET status='running', current_phase='DIVE', start_time=?, end_time=NULL WHERE id=?`,
    [now, target.id]);
  logEvent('mission', `Mission "${target.name}" started — phase DIVE.`, 'info', 'mission');
  res.json(getRow('SELECT * FROM missions WHERE id = ?', [target.id]));
});

// POST /api/mission/pause
router.post('/pause', requireRole('admin', 'operator'), (req, res) => {
  const m = activeMission();
  if (!m || m.status !== 'running') return res.status(400).json({ error: 'No running mission to pause' });
  runQuery(`UPDATE missions SET status='paused', current_phase='PAUSED' WHERE id=?`, [m.id]);
  logEvent('mission', `Mission "${m.name}" paused.`, 'warning', 'mission');
  res.json(getRow('SELECT * FROM missions WHERE id = ?', [m.id]));
});

// POST /api/mission/resume
router.post('/resume', requireRole('admin', 'operator'), (req, res) => {
  const m = activeMission();
  if (!m || m.status !== 'paused') return res.status(400).json({ error: 'No paused mission to resume' });
  runQuery(`UPDATE missions SET status='running', current_phase='SENSE' WHERE id=?`, [m.id]);
  logEvent('mission', `Mission "${m.name}" resumed.`, 'info', 'mission');
  res.json(getRow('SELECT * FROM missions WHERE id = ?', [m.id]));
});

// POST /api/mission/abort
router.post('/abort', requireRole('admin', 'operator'), (req, res) => {
  const m = activeMission();
  if (!m) return res.status(400).json({ error: 'No active mission to abort' });
  const now = new Date().toISOString();
  runQuery(`UPDATE missions SET status='aborted', current_phase='IDLE', end_time=? WHERE id=?`, [now, m.id]);
  logEvent('mission', `Mission "${m.name}" ABORTED by operator.`, 'critical', 'mission');
  res.json(getRow('SELECT * FROM missions WHERE id = ?', [m.id]));
});

// PUT /api/missions/:id/configuration — update mission parameters while running
router.put('/:id/configuration', requireRole('admin', 'operator'), (req, res) => {
  const m = getRow('SELECT * FROM missions WHERE id = ?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Mission not found' });
  const allowed = ['sampling_interval', 'max_depth', 'duration_hours', 'surface_interval', 'comm_interval'];
  const updates = {};
  for (const k of allowed) if (req.body && req.body[k] !== undefined) updates[k] = req.body[k];
  if (Object.keys(updates).length) {
    const sql = `UPDATE missions SET ${Object.keys(updates).map((k) => `${k}=?`).join(', ')} WHERE id=?`;
    runQuery(sql, [...Object.values(updates), m.id]);
  }
  logEvent('mission', `Mission "${m.name}" parameters updated.`, 'info', 'mission');
  res.json(getRow('SELECT * FROM missions WHERE id = ?', [m.id]));
});

// DELETE /api/missions/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  runQuery('DELETE FROM missions WHERE id = ?', [req.params.id]);
  res.json({ deleted: true });
});

module.exports = router;
module.exports.activeMission = activeMission;
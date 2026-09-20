const express = require('express');
const { runQuery, logEvent } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/settings — all key/value settings
router.get('/', (req, res) => {
  res.json(runQuery('SELECT key, value, description, updated_at FROM settings ORDER BY key'));
});

// PUT /api/settings — bulk update (admin only)
router.put('/', requireRole('admin'), (req, res) => {
  const updates = req.body || {};
  const keys = Object.keys(updates);
  for (const k of keys) {
    const existing = require('../database/db').getRow('SELECT key FROM settings WHERE key = ?', [k]);
    if (existing) {
      runQuery('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [String(updates[k]), new Date().toISOString(), k]);
    } else {
      require('../database/db').insert('settings', { key: k, value: String(updates[k]), description: '' });
    }
  }
  logEvent('settings', `Settings updated by ${req.user.username}: ${keys.join(', ')}`, 'info', 'system');
  res.json({ updated: keys.length });
});

// POST /api/settings — alias for PUT (used by demo page)
router.post('/', requireRole('admin'), (req, res) => {
  const updates = req.body || {};
  const keys = Object.keys(updates);
  for (const k of keys) {
    const existing = require('../database/db').getRow('SELECT key FROM settings WHERE key = ?', [k]);
    if (existing) {
      runQuery('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [String(updates[k]), new Date().toISOString(), k]);
    } else {
      require('../database/db').insert('settings', { key: k, value: String(updates[k]), description: '' });
    }
  }
  logEvent('settings', `Settings updated by ${req.user.username}: ${keys.join(', ')}`, 'info', 'system');
  res.json({ updated: keys.length });
});

module.exports = router;
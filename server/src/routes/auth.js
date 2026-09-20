const express = require('express');
const bcrypt = require('bcryptjs');
const { getRow, insert } = require('../database/db');
const { signToken, authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, email, password } = req.body || {};
  const ident = username || email;
  if (!ident || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }
  const user = getRow('SELECT * FROM users WHERE username = ? OR email = ?', [ident, ident]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// POST /api/auth/register — enforced to admin create; public during demo
router.post('/register', (req, res) => {
  const { username, email, password, role } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }
  if (getRow('SELECT id FROM users WHERE username = ? OR email = ?', [username, email])) {
    return res.status(409).json({ error: 'Username or email already exists' });
  }
  const userRole = ['admin', 'researcher', 'operator', 'viewer'].includes(role) ? role : 'viewer';
  const hash = bcrypt.hashSync(password, 10);
  const id = insert('users', {
    username, email, password_hash: hash, role: userRole,
  });
  const user = { id, username, email, role: userRole };
  res.status(201).json({ token: signToken(user), user });
});

// GET /api/auth/me — current user
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

// GET /api/auth/users — list users (admin only)
router.get('/users', authenticate, requireRole('admin'), (req, res) => {
  const users = require('../database/db').runQuery(
    'SELECT id, username, email, role, created_at FROM users ORDER BY id'
  );
  res.json(users);
});

module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/users
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, name, role, active, created_at FROM users ORDER BY id').all();
  res.json(users);
});

// POST /api/users (admin only)
router.post('/', adminOnly, (req, res) => {
  const { username, name, password, role } = req.body;
  if (!username || !name || !password) {
    return res.status(400).json({ error: 'Usuário, nome e senha são obrigatórios' });
  }

  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(409).json({ error: 'Usuário já existe' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, name, password, role) VALUES (?, ?, ?, ?)').run(username, name, hash, role || 'user');

  res.status(201).json({ id: result.lastInsertRowid, username, name, role: role || 'user', active: 1 });
});

// PUT /api/users/:id (admin only)
router.put('/:id', adminOnly, (req, res) => {
  const { name, username, role, password, active } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const newName = name || user.name;
  const newUsername = username || user.username;
  const newRole = role || user.role;
  const newActive = active !== undefined ? active : user.active;

  if (newUsername !== user.username) {
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, req.params.id);
    if (dup) return res.status(409).json({ error: 'Usuário já existe' });
  }

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET name=?, username=?, role=?, password=?, active=? WHERE id=?').run(newName, newUsername, newRole, hash, newActive, req.params.id);
  } else {
    db.prepare('UPDATE users SET name=?, username=?, role=?, active=? WHERE id=?').run(newName, newUsername, newRole, newActive, req.params.id);
  }

  res.json({ id: +req.params.id, username: newUsername, name: newName, role: newRole, active: newActive });
});

// DELETE /api/users/:id (admin only — soft delete)
router.delete('/:id', adminOnly, (req, res) => {
  if (+req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode desativar a si mesmo' });
  }
  const db = getDb();
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

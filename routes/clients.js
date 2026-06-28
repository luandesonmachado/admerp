const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/clients
router.get('/', (req, res) => {
  const db = getDb();
  const clients = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM tasks t WHERE t.client_id = c.id AND t.status != 'done') as pending_tasks
    FROM clients c WHERE c.active = 1 ORDER BY c.name
  `).all();
  res.json(clients);
});

// GET /api/clients/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND active = 1').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(client);
});

// POST /api/clients
router.post('/', (req, res) => {
  const { name, initials, color } = req.body;
  if (!name || !initials) {
    return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });
  }
  const db = getDb();
  const result = db.prepare('INSERT INTO clients (name, initials, color) VALUES (?, ?, ?)').run(name, initials, color || '#1389c7');
  res.status(201).json({ id: result.lastInsertRowid, name, initials, color: color || '#1389c7', active: 1 });
});

// PUT /api/clients/:id
router.put('/:id', (req, res) => {
  const { name, initials, color } = req.body;
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  db.prepare('UPDATE clients SET name=?, initials=?, color=? WHERE id=?').run(
    name || client.name, initials || client.initials, color || client.color, req.params.id
  );
  res.json({ id: +req.params.id, name: name || client.name, initials: initials || client.initials, color: color || client.color });
});

// DELETE /api/clients/:id (soft delete)
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE clients SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

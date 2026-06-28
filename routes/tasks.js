const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/tasks — with filters
router.get('/', (req, res) => {
  const db = getDb();
  const { client_id, status, priority, assigned_to, project, due_from, due_to } = req.query;

  let sql = `
    SELECT t.*, 
      u.name as assigned_name, u.username as assigned_username,
      c.name as client_name, c.initials as client_initials, c.color as client_color,
      cr.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN clients c ON t.client_id = c.id
    LEFT JOIN users cr ON t.created_by = cr.id
    WHERE 1=1
  `;
  const params = [];

  if (client_id) { sql += ' AND t.client_id = ?'; params.push(client_id); }
  if (status) {
    const statuses = status.split(',');
    sql += ` AND t.status IN (${statuses.map(() => '?').join(',')})`;
    params.push(...statuses);
  }
  if (priority) {
    const priorities = priority.split(',');
    sql += ` AND t.priority IN (${priorities.map(() => '?').join(',')})`;
    params.push(...priorities);
  }
  if (assigned_to) {
    const assignees = assigned_to.split(',');
    sql += ` AND t.assigned_to IN (${assignees.map(() => '?').join(',')})`;
    params.push(...assignees);
  }
  if (project) { sql += ' AND t.project = ?'; params.push(project); }
  if (due_from) { sql += ' AND t.due_date >= ?'; params.push(due_from); }
  if (due_to) { sql += ' AND t.due_date <= ?'; params.push(due_to); }

  sql += ' ORDER BY t.position ASC, t.created_at DESC';

  const tasks = db.prepare(sql).all(...params);
  res.json(tasks);
});

// GET /api/tasks/projects — unique project names
router.get('/projects', (req, res) => {
  const db = getDb();
  const projects = db.prepare("SELECT DISTINCT project FROM tasks WHERE project != '' ORDER BY project").all();
  res.json(projects.map(p => p.project));
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, u.name as assigned_name, c.name as client_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
  res.json(task);
});

// POST /api/tasks
router.post('/', (req, res) => {
  const { title, description, status, priority, due_date, project, client_id, assigned_to } = req.body;
  if (!title || !client_id) {
    return res.status(400).json({ error: 'Título e cliente são obrigatórios' });
  }

  const db = getDb();
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as next FROM tasks WHERE status = ? AND client_id = ?').get(status || 'todo', client_id);

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date, project, client_id, assigned_to, created_by, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description || '', status || 'todo', priority || 'medium',
    due_date || null, project || '', client_id,
    assigned_to || null, req.user.id, maxPos.next
  );

  const task = db.prepare(`
    SELECT t.*, u.name as assigned_name, c.name as client_name, c.initials as client_initials, c.color as client_color
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

  const { title, description, status, priority, due_date, project, client_id, assigned_to } = req.body;

  db.prepare(`
    UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=?, project=?, client_id=?, assigned_to=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    title ?? task.title, description ?? task.description, status ?? task.status,
    priority ?? task.priority, due_date ?? task.due_date, project ?? task.project,
    client_id ?? task.client_id, assigned_to ?? task.assigned_to, req.params.id
  );

  const updated = db.prepare(`
    SELECT t.*, u.name as assigned_name, c.name as client_name, c.initials as client_initials, c.color as client_color
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// PATCH /api/tasks/:id/position — reorder (drag & drop)
router.patch('/:id/position', (req, res) => {
  const { status, position } = req.body;
  const db = getDb();
  db.prepare(`UPDATE tasks SET status=?, position=?, updated_at=datetime('now') WHERE id=?`).run(status, position, req.params.id);
  res.json({ success: true });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

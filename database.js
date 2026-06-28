const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
let dbWrapper = null;

// ── Wrapper to provide better-sqlite3-like API over sql.js ──
class DbWrapper {
  constructor(sqlDb, dbPath) {
    this._db = sqlDb;
    this._path = dbPath;
  }

  _save() {
    const data = this._db.export();
    fs.writeFileSync(this._path, Buffer.from(data));
  }

  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  prepare(sql) {
    const db = this._db;
    const self = this;

    return {
      run(...params) {
        db.run(sql, params);
        const lastId = db.exec("SELECT last_insert_rowid() as id");
        const lastInsertRowid = lastId[0]?.values[0]?.[0] || 0;
        const changes = db.getRowsModified();
        self._save();
        return {
          changes,
          lastInsertRowid
        };
      },

      get(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },

      all(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  pragma(str) {
    try { this._db.run(`PRAGMA ${str}`); } catch (e) { /* ignore */ }
  }
}

// ── Initialize ──
async function initDb() {
  const SQL = await initSqlJs();
  let sqlDb;

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  dbWrapper = new DbWrapper(sqlDb, DB_PATH);
  dbWrapper.pragma('journal_mode = WAL');
  dbWrapper.pragma('foreign_keys = ON');
  initTables();
  seedData();
  return dbWrapper;
}

function getDb() {
  if (!dbWrapper) throw new Error('Database not initialized. Call initDb() first.');
  return dbWrapper;
}

// ── Schema ──
function initTables() {
  dbWrapper._db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  dbWrapper._db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT DEFAULT '#1389c7',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  dbWrapper._db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      project TEXT DEFAULT '',
      client_id INTEGER NOT NULL,
      assigned_to INTEGER,
      created_by INTEGER,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  dbWrapper._save();
}

// ── Seed ──
function seedData() {
  const userCount = dbWrapper.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) return;

  console.log('🌱 Seeding database...');
  const hash = bcrypt.hashSync('admin123', 10);

  const insertUser = dbWrapper.prepare('INSERT INTO users (username, name, password, role) VALUES (?, ?, ?, ?)');
  insertUser.run('admin', 'Administrador', hash, 'admin');
  insertUser.run('paulo', 'Paulo', hash, 'user');
  insertUser.run('erick', 'Erick', hash, 'user');
  insertUser.run('luanderson', 'Luanderson', hash, 'user');
  insertUser.run('joao', 'João', hash, 'user');

  const insertClient = dbWrapper.prepare('INSERT INTO clients (name, initials, color) VALUES (?, ?, ?)');
  insertClient.run('2M Serviços Médicos', '2M', '#1389c7');
  insertClient.run('H E Serviços Médicos', 'HE', '#f3822b');
  insertClient.run('K F Serviços Médicos', 'KF', '#2e9e5b');

  const insertTask = dbWrapper.prepare(`INSERT INTO tasks (title, description, status, priority, due_date, project, client_id, assigned_to, created_by, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  insertTask.run('Apuração IRPJ/CSLL Trimestral', 'Realizar a apuração trimestral dos tributos IRPJ e CSLL com base na equiparação hospitalar.', 'in_progress', 'high', '2026-07-15', 'Assessoria Fiscal', 1, 2, 1, 0);
  insertTask.run('Conciliação bancária mensal', 'Conferência e conciliação dos extratos bancários com os lançamentos contábeis do mês de junho.', 'todo', 'medium', '2026-07-10', 'Assessoria Contábil', 2, 3, 1, 0);
  insertTask.run('Revisão de contratos societários', 'Análise e revisão dos contratos societários para adequação às novas normas regulatórias.', 'review', 'low', '2026-07-20', 'Assessoria Administrativa', 3, 4, 1, 0);

  console.log('✅ Seed completed: 5 users, 3 clients, 3 tasks');
}

module.exports = { initDb, getDb };

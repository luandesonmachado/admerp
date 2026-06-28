const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const clientsRoutes = require('./routes/clients');
const tasksRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/tasks', tasksRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota não encontrada' });
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Async startup: initialize DB (sql.js loads WASM) before listening
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`\n🏥 ADM Saúde ERP — Task Manager`);
      console.log(`   Servidor rodando em http://localhost:${PORT}`);
      console.log(`   Login: admin / admin123\n`);
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err);
    process.exit(1);
  }
}

start();

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Banco SQLite (arquivo local) ─────────────────────────────────────────
const db = new Database(path.join(__dirname, 'dados.db'));

// Criar tabelas automaticamente
db.exec(`
  CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    telefone TEXT,
    categoria TEXT DEFAULT 'geral',
    observacoes TEXT,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now','localtime')),
    atualizado_em TEXT DEFAULT (datetime('now','localtime'))
  );
  
  -- Dados de exemplo
  INSERT OR IGNORE INTO registros (nome, email, telefone, categoria) VALUES
    ('João Silva', 'joao@email.com', '(11) 99999-1111', 'cliente'),
    ('Maria Santos', 'maria@email.com', '(11) 99999-2222', 'fornecedor'),
    ('Pedro Costa', 'pedro@email.com', '(11) 99999-3333', 'cliente');
`);

app.use(express.json());
app.use(express.static('public'));

// ─── API REST ─────────────────────────────────────────────────────────────
app.get('/api/registros', (req, res) => {
  const { busca, categoria } = req.query;
  let query = 'SELECT * FROM registros WHERE ativo = 1';
  const params = [];
  if (busca) { query += ' AND (nome LIKE ? OR email LIKE ?)'; params.push(`%${busca}%`, `%${busca}%`); }
  if (categoria) { query += ' AND categoria = ?'; params.push(categoria); }
  query += ' ORDER BY criado_em DESC';
  res.json(db.prepare(query).all(...params));
});

app.get('/api/registros/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM registros WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(r);
});

app.post('/api/registros', (req, res) => {
  const { nome, email, telefone, categoria, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  try {
    const r = db.prepare('INSERT INTO registros (nome,email,telefone,categoria,observacoes) VALUES (?,?,?,?,?)').run(nome, email||null, telefone||null, categoria||'geral', observacoes||null);
    res.status(201).json(db.prepare('SELECT * FROM registros WHERE id = ?').get(r.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ erro: 'Email já cadastrado' });
    res.status(500).json({ erro: err.message });
  }
});

app.put('/api/registros/:id', (req, res) => {
  const { nome, email, telefone, categoria, observacoes } = req.body;
  db.prepare("UPDATE registros SET nome=COALESCE(?,nome), email=COALESCE(?,email), telefone=COALESCE(?,telefone), categoria=COALESCE(?,categoria), observacoes=COALESCE(?,observacoes), atualizado_em=datetime('now','localtime') WHERE id=?").run(nome,email,telefone,categoria,observacoes,req.params.id);
  res.json(db.prepare('SELECT * FROM registros WHERE id = ?').get(req.params.id));
});

app.delete('/api/registros/:id', (req, res) => {
  db.prepare('UPDATE registros SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`🟢 CRUD SQLite rodando em http://localhost:${PORT}`);
  console.log(`   Acesse o painel em http://localhost:${PORT}`);
});
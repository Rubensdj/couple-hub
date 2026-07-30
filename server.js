const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ===== MIDDLEWARES =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(session({
  secret: 'couple-hub-secret-2024-rubens',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000, sameSite: 'lax' }
}));

// ===== BANCO DE DADOS JSON =====
const DB_FILE = path.join(__dirname, 'db.json');
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch(e) { console.error('DB corrompido, criando novo:', e.message); }
  }
  return {
    users: [],
    fotos: [], videos: [], momentos: [],
    metas: [], sonhos: [], gastos: [],
    acordos: [], proibicoes: [], recibos: [],
    agenda: [], dicas: [], redesSociais: [],
    contrato: { regras: [], quebras: [], texto: '', tipo: '', assinado: false },
    configuracoes: {
      nomeCasal: '', pessoa1: '', pessoa2: '',
      tipoRelacionamento: 'Namoro', dataInicio: '',
      corTema: '#ec4899', notificacoes: true, privacidade: 'privado'
    }
  };
}
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
let db = loadDB();

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {
  if (req.session.userId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ erro: 'Nao autenticado.' });
  res.redirect('/login');
}

// ===== ROTAS DE PÁGINAS =====
app.get('/', (req, res) => {
  if (req.session.userId) res.sendFile(path.join(__dirname, 'public', 'app.html'));
  else res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/app', auth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cadastro.html')));

// ===== STATIC (depois das rotas) =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== API AUTH =====
app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });
  if (db.users.find(u => u.email === email)) return res.status(409).json({ erro: 'Email ja cadastrado.' });
  if (senha.length < 6) return res.status(400).json({ erro: 'Senha minima de 6 caracteres.' });
  const user = { id: Date.now(), nome, email, senha: await bcrypt.hash(senha, 10) };
  db.users.push(user); saveDB();
  res.status(201).json({ sucesso: true, mensagem: 'Cadastro realizado!' });
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });
  const user = db.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(senha, user.senha)))
    return res.status(401).json({ erro: 'Email ou senha invalidos.' });
  req.session.userId = user.id;
  req.session.userName = user.nome;
  res.json({ sucesso: true, mensagem: 'Login realizado!' });
});

app.post('/api/logout', (req, res) => { req.session.destroy(() => res.json({ sucesso: true })); });

app.get('/api/usuario', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ erro: 'Nao autenticado.' });
  const u = db.users.find(u => u.id === req.session.userId);
  if (!u) return res.status(401).json({ erro: 'Usuario nao encontrado.' });
  res.json({ nome: u.nome, email: u.email });
});

// ===== CONFIG =====
app.get('/api/config', auth, (req, res) => res.json(db.configuracoes));
app.put('/api/config', auth, (req, res) => {
  db.configuracoes = { ...db.configuracoes, ...req.body };
  saveDB();
  res.json(db.configuracoes);
});

// ===== FOTOS =====
app.get('/api/fotos', auth, (req, res) => res.json(db.fotos));
app.post('/api/fotos', auth, (req, res) => {
  const { titulo, descricao, dataBase64 } = req.body;
  if (!dataBase64) return res.status(400).json({ erro: 'Imagem obrigatoria.' });
  const m = dataBase64.match(/^data:image\/([\w+]+);base64,(.+)$/);
  if (!m) return res.status(400).json({ erro: 'Formato invalido.' });
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1].replace('+','');
  const fname = `foto_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fname), m[2], 'base64');
  const foto = { id: Date.now(), titulo: titulo || '', descricao: descricao || '', arquivo: `/uploads/${fname}`, data: new Date().toISOString() };
  db.fotos.push(foto); saveDB();
  res.json(foto);
});
app.delete('/api/fotos/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  const foto = db.fotos.find(f => f.id === id);
  if (foto) {
    const fp = path.join(__dirname, 'public', foto.arquivo);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.fotos = db.fotos.filter(f => f.id !== id); saveDB();
  }
  res.json({ sucesso: true });
});

// ===== VIDEOS =====
app.get('/api/videos', auth, (req, res) => res.json(db.videos));
app.post('/api/videos', auth, (req, res) => {
  const { titulo, descricao, dataBase64 } = req.body;
  if (!dataBase64) return res.status(400).json({ erro: 'Video obrigatorio.' });
  const m = dataBase64.match(/^data:video\/([\w+]+);base64,(.+)$/);
  if (!m) return res.status(400).json({ erro: 'Formato invalido.' });
  const ext = m[1] === 'quicktime' ? 'mov' : m[1].replace('+','');
  const fname = `video_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fname), m[2], 'base64');
  const v = { id: Date.now(), titulo: titulo || '', descricao: descricao || '', arquivo: `/uploads/${fname}`, data: new Date().toISOString() };
  db.videos.push(v); saveDB();
  res.json(v);
});
app.delete('/api/videos/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  const v = db.videos.find(x => x.id === id);
  if (v) {
    const fp = path.join(__dirname, 'public', v.arquivo);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.videos = db.videos.filter(x => x.id !== id); saveDB();
  }
  res.json({ sucesso: true });
});

// ===== MOMENTOS =====
app.get('/api/momentos', auth, (req, res) => res.json(db.momentos));
app.post('/api/momentos', auth, (req, res) => {
  const m = { id: Date.now(), titulo: req.body.titulo || '', descricao: req.body.descricao || '', data: req.body.data || new Date().toISOString() };
  db.momentos.push(m); saveDB();
  res.json(m);
});
app.delete('/api/momentos/:id', auth, (req, res) => {
  db.momentos = db.momentos.filter(m => m.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== METAS =====
app.get('/api/metas', auth, (req, res) => res.json(db.metas));
app.post('/api/metas', auth, (req, res) => {
  const m = { id: Date.now(), titulo: req.body.titulo, descricao: req.body.descricao || '', prazo: req.body.prazo || '', status: 'pendente', progresso: 0 };
  db.metas.push(m); saveDB();
  res.json(m);
});
app.put('/api/metas/:id', auth, (req, res) => {
  const m = db.metas.find(x => x.id === parseInt(req.params.id));
  if (!m) return res.status(404).json({ erro: 'Meta nao encontrada.' });
  Object.assign(m, req.body); saveDB();
  res.json(m);
});
app.delete('/api/metas/:id', auth, (req, res) => {
  db.metas = db.metas.filter(m => m.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== SONHOS =====
app.get('/api/sonhos', auth, (req, res) => res.json(db.sonhos));
app.post('/api/sonhos', auth, (req, res) => {
  const s = { id: Date.now(), titulo: req.body.titulo, descricao: req.body.descricao || '', categoria: req.body.categoria || 'geral', status: 'sonhando' };
  db.sonhos.push(s); saveDB();
  res.json(s);
});
app.put('/api/sonhos/:id', auth, (req, res) => {
  const s = db.sonhos.find(x => x.id === parseInt(req.params.id));
  if (!s) return res.status(404).json({ erro: 'Sonho nao encontrado.' });
  Object.assign(s, req.body); saveDB();
  res.json(s);
});
app.delete('/api/sonhos/:id', auth, (req, res) => {
  db.sonhos = db.sonhos.filter(s => s.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== GASTOS =====
app.get('/api/gastos', auth, (req, res) => res.json(db.gastos));
app.post('/api/gastos', auth, (req, res) => {
  const g = { id: Date.now(), descricao: req.body.descricao, valor: parseFloat(req.body.valor) || 0, categoria: req.body.categoria || '', pagoPor: req.body.pagoPor || '', data: new Date().toISOString() };
  db.gastos.push(g); saveDB();
  res.json(g);
});
app.delete('/api/gastos/:id', auth, (req, res) => {
  db.gastos = db.gastos.filter(g => g.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== CONTRATO =====
app.get('/api/contrato', auth, (req, res) => res.json(db.contrato));
app.put('/api/contrato', auth, (req, res) => {
  Object.assign(db.contrato, req.body); saveDB();
  res.json(db.contrato);
});
app.post('/api/contrato/regras', auth, (req, res) => {
  db.contrato.regras.push({ id: Date.now(), texto: req.body.texto, ativa: true });
  saveDB();
  res.json(db.contrato.regras[db.contrato.regras.length - 1]);
});
app.put('/api/contrato/regras/:id', auth, (req, res) => {
  const r = db.contrato.regras.find(x => x.id === parseInt(req.params.id));
  if (r) { Object.assign(r, req.body); saveDB(); }
  res.json(r || {});
});
app.delete('/api/contrato/regras/:id', auth, (req, res) => {
  db.contrato.regras = db.contrato.regras.filter(r => r.id !== parseInt(req.params.id));
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/contrato/quebras', auth, (req, res) => {
  const q = { id: Date.now(), regraQuebrada: req.body.regraQuebrada, descricao: req.body.descricao || '', consequencia: req.body.consequencia || '', data: new Date().toISOString() };
  db.contrato.quebras.push(q); saveDB();
  res.json(q);
});
app.delete('/api/contrato/quebras/:id', auth, (req, res) => {
  db.contrato.quebras = db.contrato.quebras.filter(q => q.id !== parseInt(req.params.id));
  saveDB();
  res.json({ sucesso: true });
});

// ===== ACORDOS =====
app.get('/api/acordos', auth, (req, res) => res.json(db.acordos));
app.post('/api/acordos', auth, (req, res) => {
  const a = { id: Date.now(), titulo: req.body.titulo, descricao: req.body.descricao || '', prazo: req.body.prazo || '', status: 'ativo' };
  db.acordos.push(a); saveDB();
  res.json(a);
});
app.put('/api/acordos/:id', auth, (req, res) => {
  const a = db.acordos.find(x => x.id === parseInt(req.params.id));
  if (a) { Object.assign(a, req.body); saveDB(); }
  res.json(a || {});
});
app.delete('/api/acordos/:id', auth, (req, res) => {
  db.acordos = db.acordos.filter(a => a.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== PROIBICOES =====
app.get('/api/proibicoes', auth, (req, res) => res.json(db.proibicoes));
app.post('/api/proibicoes', auth, (req, res) => {
  const p = { id: Date.now(), texto: req.body.texto, severidade: req.body.severidade || 'media', data: new Date().toISOString() };
  db.proibicoes.push(p); saveDB();
  res.json(p);
});
app.delete('/api/proibicoes/:id', auth, (req, res) => {
  db.proibicoes = db.proibicoes.filter(p => p.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== RECIBOS =====
app.get('/api/recibos', auth, (req, res) => res.json(db.recibos));
app.post('/api/recibos', auth, (req, res) => {
  const r = { id: Date.now(), tipo: req.body.tipo || '', descricao: req.body.descricao || '', valor: req.body.valor || '', data: new Date().toISOString() };
  db.recibos.push(r); saveDB();
  res.json(r);
});
app.delete('/api/recibos/:id', auth, (req, res) => {
  db.recibos = db.recibos.filter(r => r.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== AGENDA =====
app.get('/api/agenda', auth, (req, res) => res.json(db.agenda));
app.post('/api/agenda', auth, (req, res) => {
  const e = { id: Date.now(), titulo: req.body.titulo, data: req.body.data, descricao: req.body.descricao || '', tipo: req.body.tipo || 'evento', recorrencia: req.body.recorrencia || 'anual' };
  db.agenda.push(e); saveDB();
  res.json(e);
});
app.delete('/api/agenda/:id', auth, (req, res) => {
  db.agenda = db.agenda.filter(e => e.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== DICAS =====
app.get('/api/dicas', auth, (req, res) => res.json(db.dicas));
app.post('/api/dicas', auth, (req, res) => {
  const d = { id: Date.now(), titulo: req.body.titulo, texto: req.body.texto, categoria: req.body.categoria || 'geral', data: new Date().toISOString() };
  db.dicas.push(d); saveDB();
  res.json(d);
});
app.delete('/api/dicas/:id', auth, (req, res) => {
  db.dicas = db.dicas.filter(d => d.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== REDES SOCIAIS =====
app.get('/api/redes', auth, (req, res) => res.json(db.redesSociais));
app.post('/api/redes', auth, (req, res) => {
  const r = { id: Date.now(), plataforma: req.body.plataforma, url: req.body.url, usuario: req.body.usuario || '' };
  db.redesSociais.push(r); saveDB();
  res.json(r);
});
app.delete('/api/redes/:id', auth, (req, res) => {
  db.redesSociais = db.redesSociais.filter(r => r.id !== parseInt(req.params.id)); saveDB();
  res.json({ sucesso: true });
});

// ===== SOBRE NOS =====
app.get('/api/sobre', auth, (req, res) => res.json({ sobreNos: db.configuracoes.sobreNos || '', historias: db.configuracoes.historias || [] }));
app.put('/api/sobre', auth, (req, res) => {
  db.configuracoes.sobreNos = req.body.sobreNos || '';
  db.configuracoes.historias = req.body.historias || [];
  saveDB();
  res.json({ sucesso: true });
});

// ===== PROXIMIDADE =====
app.get('/api/proximidade', auth, (req, res) => {
  res.json({ nivel: db.configuracoes.proximidade || 50, status: db.configuracoes.statusRelacao || 'Conectados' });
});
app.put('/api/proximidade', auth, (req, res) => {
  db.configuracoes.proximidade = parseInt(req.body.nivel) || 50;
  db.configuracoes.statusRelacao = req.body.status || 'Conectados';
  saveDB();
  res.json({ sucesso: true });
});

// ===== START =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Couple Hub rodando em http://localhost:${PORT}`);
});

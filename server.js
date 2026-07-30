const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(session({
  secret: 'couple-hub-secret-2024-xyz',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ============ BANCO DE DADOS (arquivo JSON) ============
const DB_FILE = path.join(__dirname, 'db.json');
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return {
    users: [],
    couple: null,
    fotos: [],
    videos: [],
    momentos: [],
    metas: [],
    sonhos: [],
    gastos: [],
    acordos: [],
    contrato: { regras: [], quebras: [], texto: '', tipo: '', assinado: false },
    recibos: [],
    proibicoes: [],
    agenda: [],
    dicas: [],
    redesSociais: [],
    configuracoes: {
      nomeCasal: '',
      pessoa1: '',
      pessoa2: '',
      tipoRelacionamento: 'Namoro',
      dataInicio: '',
      corTema: '#ec4899',
      notificacoes: true,
      privacidade: 'privado'
    }
  };
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
let db = loadDB();

// ============ MIDDLEWARE ============
function authMiddleware(req, res, next) {
  if (req.session.userId) next();
  else res.redirect('/login');
}

// ============ ROTAS DE AUTENTICACAO ============
app.get('/', (req, res) => {
  if (req.session.userId) res.sendFile(path.join(__dirname, 'public', 'app.html'));
  else res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/cadastro', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cadastro.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/api/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });
  if (db.users.find(u => u.email === email)) return res.status(409).json({ erro: 'Email ja cadastrado.' });
  if (senha.length < 6) return res.status(400).json({ erro: 'Senha minima de 6 caracteres.' });
  const user = { id: Date.now(), nome, email, senha: await bcrypt.hash(senha, 10) };
  db.users.push(user); saveDB(db);
  res.status(201).json({ sucesso: true, mensagem: 'Cadastro realizado!' });
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });
  const user = db.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(senha, user.senha))) return res.status(401).json({ erro: 'Email ou senha invalidos.' });
  req.session.userId = user.id; req.session.userName = user.nome;
  res.json({ sucesso: true });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ sucesso: true }); });

app.get('/api/usuario', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ erro: 'Nao autenticado.' });
  const u = db.users.find(u => u.id === req.session.userId);
  res.json({ nome: u.nome, email: u.email });
});

// ============ CONFIGURACOES ============
app.get('/api/config', authMiddleware, (req, res) => res.json(db.configuracoes));
app.put('/api/config', authMiddleware, (req, res) => {
  db.configuracoes = { ...db.configuracoes, ...req.body }; saveDB(db);
  res.json(db.configuracoes);
});

// ============ FOTOS ============
app.get('/api/fotos', authMiddleware, (req, res) => res.json(db.fotos));
app.post('/api/fotos', authMiddleware, (req, res) => {
  const { titulo, descricao, dataBase64 } = req.body;
  if (!dataBase64) return res.status(400).json({ erro: 'Imagem obrigatoria.' });
  const matches = dataBase64.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) return res.status(400).json({ erro: 'Formato invalido.' });
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const fileName = `foto_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, matches[2], { encoding: 'base64' });
  const foto = { id: Date.now(), titulo: titulo || '', descricao: descricao || '', arquivo: `/uploads/${fileName}`, data: new Date().toISOString() };
  db.fotos.push(foto); saveDB(db);
  res.json(foto);
});
app.delete('/api/fotos/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const foto = db.fotos.find(f => f.id === id);
  if (foto) {
    const fp = path.join(__dirname, 'public', foto.arquivo);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.fotos = db.fotos.filter(f => f.id !== id); saveDB(db);
  }
  res.json({ sucesso: true });
});

// ============ VIDEOS ============
app.get('/api/videos', authMiddleware, (req, res) => res.json(db.videos));
app.post('/api/videos', authMiddleware, (req, res) => {
  const { titulo, descricao, dataBase64 } = req.body;
  if (!dataBase64) return res.status(400).json({ erro: 'Video obrigatorio.' });
  const matches = dataBase64.match(/^data:video\/(\w+);base64,(.+)$/);
  if (!matches) return res.status(400).json({ erro: 'Formato invalido.' });
  const ext = matches[1] === 'quicktime' ? 'mov' : matches[1];
  const fileName = `video_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, matches[2], { encoding: 'base64' });
  const video = { id: Date.now(), titulo: titulo || '', descricao: descricao || '', arquivo: `/uploads/${fileName}`, data: new Date().toISOString() };
  db.videos.push(video); saveDB(db);
  res.json(video);
});
app.delete('/api/videos/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const v = db.videos.find(f => f.id === id);
  if (v) {
    const fp = path.join(__dirname, 'public', v.arquivo);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.videos = db.videos.filter(f => f.id !== id); saveDB(db);
  }
  res.json({ sucesso: true });
});

// ============ MOMENTOS ============
app.get('/api/momentos', authMiddleware, (req, res) => res.json(db.momentos));
app.post('/api/momentos', authMiddleware, (req, res) => {
  const m = { id: Date.now(), ...req.body, data: new Date().toISOString() };
  db.momentos.push(m); saveDB(db);
  res.json(m);
});
app.delete('/api/momentos/:id', authMiddleware, (req, res) => {
  db.momentos = db.momentos.filter(m => m.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ METAS E SONHOS ============
app.get('/api/metas', authMiddleware, (req, res) => res.json(db.metas));
app.post('/api/metas', authMiddleware, (req, res) => {
  const m = { id: Date.now(), ...req.body, status: 'pendente', progresso: 0, criadoEm: new Date().toISOString() };
  db.metas.push(m); saveDB(db);
  res.json(m);
});
app.put('/api/metas/:id', authMiddleware, (req, res) => {
  const m = db.metas.find(x => x.id === parseInt(req.params.id));
  if (!m) return res.status(404).json({ erro: 'Nao encontrada.' });
  Object.assign(m, req.body); saveDB(db);
  res.json(m);
});
app.delete('/api/metas/:id', authMiddleware, (req, res) => {
  db.metas = db.metas.filter(m => m.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

app.get('/api/sonhos', authMiddleware, (req, res) => res.json(db.sonhos));
app.post('/api/sonhos', authMiddleware, (req, res) => {
  const s = { id: Date.now(), ...req.body, status: 'sonhando', criadoEm: new Date().toISOString() };
  db.sonhos.push(s); saveDB(db);
  res.json(s);
});
app.delete('/api/sonhos/:id', authMiddleware, (req, res) => {
  db.sonhos = db.sonhos.filter(s => s.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ GASTOS ============
app.get('/api/gastos', authMiddleware, (req, res) => res.json(db.gastos));
app.post('/api/gastos', authMiddleware, (req, res) => {
  const g = { id: Date.now(), ...req.body, data: new Date().toISOString() };
  db.gastos.push(g); saveDB(db);
  res.json(g);
});
app.delete('/api/gastos/:id', authMiddleware, (req, res) => {
  db.gastos = db.gastos.filter(g => g.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ CONTRATO DO CASAL ============
app.get('/api/contrato', authMiddleware, (req, res) => res.json(db.contrato));
app.put('/api/contrato', authMiddleware, (req, res) => {
  db.contrato = { ...db.contrato, ...req.body }; saveDB(db);
  res.json(db.contrato);
});

app.post('/api/contrato/regras', authMiddleware, (req, res) => {
  db.contrato.regras.push({ id: Date.now(), texto: req.body.texto, ativa: true });
  saveDB(db);
  res.json(db.contrato.regras);
});
app.put('/api/contrato/regras/:id', authMiddleware, (req, res) => {
  const r = db.contrato.regras.find(x => x.id === parseInt(req.params.id));
  if (r) { Object.assign(r, req.body); saveDB(db); }
  res.json(r || {});
});
app.delete('/api/contrato/regras/:id', authMiddleware, (req, res) => {
  db.contrato.regras = db.contrato.regras.filter(r => r.id !== parseInt(req.params.id));
  saveDB(db);
  res.json({ sucesso: true });
});

// QUEBRA DE CONTRATO
app.get('/api/contrato/quebras', authMiddleware, (req, res) => res.json(db.contrato.quebras));
app.post('/api/contrato/quebras', authMiddleware, (req, res) => {
  const q = { id: Date.now(), regraQuebrada: req.body.regraQuebrada, descricao: req.body.descricao || '', data: new Date().toISOString(), consequencia: req.body.consequencia || '' };
  db.contrato.quebras.push(q); saveDB(db);
  res.json(q);
});
app.delete('/api/contrato/quebras/:id', authMiddleware, (req, res) => {
  db.contrato.quebras = db.contrato.quebras.filter(q => q.id !== parseInt(req.params.id));
  saveDB(db);
  res.json({ sucesso: true });
});

// ============ ACORDOS ============
app.get('/api/acordos', authMiddleware, (req, res) => res.json(db.acordos));
app.post('/api/acordos', authMiddleware, (req, res) => {
  const a = { id: Date.now(), ...req.body, status: 'ativo', data: new Date().toISOString() };
  db.acordos.push(a); saveDB(db);
  res.json(a);
});
app.put('/api/acordos/:id', authMiddleware, (req, res) => {
  const a = db.acordos.find(x => x.id === parseInt(req.params.id));
  if (a) { Object.assign(a, req.body); saveDB(db); }
  res.json(a || {});
});
app.delete('/api/acordos/:id', authMiddleware, (req, res) => {
  db.acordos = db.acordos.filter(a => a.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ PROIBICOES ============
app.get('/api/proibicoes', authMiddleware, (req, res) => res.json(db.proibicoes));
app.post('/api/proibicoes', authMiddleware, (req, res) => {
  const p = { id: Date.now(), texto: req.body.texto, severidade: req.body.severidade || 'media', data: new Date().toISOString() };
  db.proibicoes.push(p); saveDB(db);
  res.json(p);
});
app.delete('/api/proibicoes/:id', authMiddleware, (req, res) => {
  db.proibicoes = db.proibicoes.filter(p => p.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ RECIBOS / COMPROVANTES ============
app.get('/api/recibos', authMiddleware, (req, res) => res.json(db.recibos));
app.post('/api/recibos', authMiddleware, (req, res) => {
  const r = { id: Date.now(), tipo: req.body.tipo || '', descricao: req.body.descricao || '', valor: req.body.valor || '', data: new Date().toISOString() };
  db.recibos.push(r); saveDB(db);
  res.json(r);
});
app.delete('/api/recibos/:id', authMiddleware, (req, res) => {
  db.recibos = db.recibos.filter(r => r.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ AGENDA / DATAS COMEMORATIVAS ============
app.get('/api/agenda', authMiddleware, (req, res) => res.json(db.agenda));
app.post('/api/agenda', authMiddleware, (req, res) => {
  const e = { id: Date.now(), titulo: req.body.titulo, data: req.body.data, descricao: req.body.descricao || '', tipo: req.body.tipo || 'evento', recorrencia: req.body.recorrencia || 'anual' };
  db.agenda.push(e); saveDB(db);
  res.json(e);
});
app.delete('/api/agenda/:id', authMiddleware, (req, res) => {
  db.agenda = db.agenda.filter(e => e.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ DICAS ============
app.get('/api/dicas', authMiddleware, (req, res) => res.json(db.dicas));
app.post('/api/dicas', authMiddleware, (req, res) => {
  const d = { id: Date.now(), titulo: req.body.titulo, texto: req.body.texto, categoria: req.body.categoria || 'geral', data: new Date().toISOString() };
  db.dicas.push(d); saveDB(db);
  res.json(d);
});
app.delete('/api/dicas/:id', authMiddleware, (req, res) => {
  db.dicas = db.dicas.filter(d => d.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ REDES SOCIAIS ============
app.get('/api/redes', authMiddleware, (req, res) => res.json(db.redesSociais));
app.post('/api/redes', authMiddleware, (req, res) => {
  const r = { id: Date.now(), plataforma: req.body.plataforma, url: req.body.url, usuario: req.body.usuario || '' };
  db.redesSociais.push(r); saveDB(db);
  res.json(r);
});
app.delete('/api/redes/:id', authMiddleware, (req, res) => {
  db.redesSociais = db.redesSociais.filter(r => r.id !== parseInt(req.params.id)); saveDB(db);
  res.json({ sucesso: true });
});

// ============ SOBRE NOS ============
app.get('/api/sobre', authMiddleware, (req, res) => res.json({ sobreNos: db.configuracoes.sobreNos || '', historias: db.configuracoes.historias || [] }));
app.put('/api/sobre', authMiddleware, (req, res) => {
  db.configuracoes.sobreNos = req.body.sobreNos || '';
  db.configuracoes.historias = req.body.historias || [];
  saveDB(db);
  res.json({ sucesso: true });
});

// ============ PROXIMIDADE ============
app.get('/api/proximidade', authMiddleware, (req, res) => {
  res.json({ nivel: db.configuracoes.proximidade || 50, status: db.configuracoes.statusRelacao || 'Conectados' });
});
app.put('/api/proximidade', authMiddleware, (req, res) => {
  db.configuracoes.proximidade = req.body.nivel;
  db.configuracoes.statusRelacao = req.body.status;
  saveDB(db);
  res.json({ sucesso: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Couple Hub rodando em http://localhost:${PORT}`);
});

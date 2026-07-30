// ============ COUPLE HUB - APP.JS ============

// Estado global
let currentModule = 'dashboard';
let userData = null;
let coupleConfig = { dataInicio: '', nomeCasal: '', pessoa1: '', pessoa2: '', tipoRelacionamento: 'Namoro' };

// ============ UTILS ============
function showToast(msg, type='info') {
  const toast = document.getElementById('toast');
  const div = document.createElement('div');
  div.className = `toast-msg toast-${type}`;
  div.textContent = msg;
  toast.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

function timeTogether(dataInicio) {
  if (!dataInicio) return '0 dias';
  const inicio = new Date(dataInicio);
  const hoje = new Date();
  const diff = Math.floor((hoje - inicio) / (1000*60*60*24));
  if (diff < 30) return `${diff} dias`;
  if (diff < 365) return `${Math.floor(diff/30)} meses`;
  return `${Math.floor(diff/365)} anos e ${Math.floor((diff%365)/30)} meses`;
}

async function api(url, options={}) {
  const res = await fetch(url, { 
    ...options, 
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include'
  });
  if (res.status === 401) { window.location.href = '/login'; return null; }
  return res.json();
}

// ============ INIT ============
async function init() {
  userData = await api('/api/usuario');
  if (!userData) return;
  
  coupleConfig = await api('/api/config');
  updateUI();
  initAvatar3D();
  loadModule('dashboard');
  
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      loadModule(item.dataset.module);
    });
  });
}

function updateUI() {
  document.getElementById('coupleName').textContent = coupleConfig.nomeCasal || 'Nosso Casal';
  document.getElementById('togetherTime').textContent = `Juntos há ${timeTogether(coupleConfig.dataInicio)}`;
}

// ============ 3D AVATAR ============
let avatarScene, avatarCamera, avatarRenderer, heart1, heart2, particles = [];

function initAvatar3D() {
  const container = document.getElementById('avatar3d');
  if (!container) return;

  avatarScene = new THREE.Scene();
  avatarCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  avatarCamera.position.z = 15;

  avatarRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  avatarRenderer.setSize(container.clientWidth, container.clientHeight);
  avatarRenderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(avatarRenderer.domElement);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  avatarScene.add(ambient);
  const pointLight = new THREE.PointLight(0xec4899, 1.5, 50);
  pointLight.position.set(5, 5, 10);
  avatarScene.add(pointLight);
  const pointLight2 = new THREE.PointLight(0x8b5cf6, 1, 50);
  pointLight2.position.set(-5, -5, 10);
  avatarScene.add(pointLight2);

  // Heart 1 (Pessoa 1)
  const heartGeo = createHeartGeometry(1.2);
  const heartMat1 = new THREE.MeshStandardMaterial({ 
    color: 0xec4899, 
    metalness: 0.2, 
    roughness: 0.3,
    transparent: true,
    opacity: 0.9
  });
  heart1 = new THREE.Mesh(heartGeo, heartMat1);
  heart1.position.x = -2.5;
  avatarScene.add(heart1);

  // Heart 2 (Pessoa 2)
  const heartMat2 = new THREE.MeshStandardMaterial({ 
    color: 0x8b5cf6, 
    metalness: 0.2, 
    roughness: 0.3,
    transparent: true,
    opacity: 0.9
  });
  heart2 = new THREE.Mesh(heartGeo, heartMat2);
  heart2.position.x = 2.5;
  avatarScene.add(heart2);

  // Connecting particles
  createParticles();

  // Mouse interaction
  let mouseX = 0, mouseY = 0;
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Hearts floating and rotating
    heart1.position.y = Math.sin(time * 1.5) * 0.5;
    heart1.rotation.y = time * 0.3;
    heart1.rotation.x = Math.sin(time) * 0.2;
    heart1.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
    
    heart2.position.y = Math.sin(time * 1.5 + Math.PI) * 0.5;
    heart2.rotation.y = -time * 0.3;
    heart2.rotation.x = Math.cos(time) * 0.2;
    heart2.scale.setScalar(1 + Math.sin(time * 2 + Math.PI) * 0.05);
    
    // Particles
    particles.forEach((p, i) => {
      p.position.y += p.speed;
      p.position.x += Math.sin(time + i) * 0.01;
      if (p.position.y > 4) p.position.y = -4;
      p.material.opacity = (p.position.y + 4) / 8 * 0.6;
    });
    
    // Camera subtle follow mouse
    avatarCamera.position.x += (mouseX * 2 - avatarCamera.position.x) * 0.05;
    avatarCamera.position.y += (mouseY * 2 - avatarCamera.position.y) * 0.05;
    avatarCamera.lookAt(0, 0, 0);
    
    avatarRenderer.render(avatarScene, avatarCamera);
  }
  animate();

  // Handle resize
  window.addEventListener('resize', () => {
    avatarCamera.aspect = container.clientWidth / container.clientHeight;
    avatarCamera.updateProjectionMatrix();
    avatarRenderer.setSize(container.clientWidth, container.clientHeight);
  });
}

function createHeartGeometry(size) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0, -size*0.5, -size, -size*0.5, -size, 0);
  shape.bezierCurveTo(-size, size*0.5, 0, size*1.2, 0, size*1.5);
  shape.bezierCurveTo(0, size*1.2, size, size*0.5, size, 0);
  shape.bezierCurveTo(size, -size*0.5, 0, -size*0.5, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: size*0.3, bevelEnabled: true, bevelSegments: 4, bevelSize: 0.1, bevelThickness: 0.1 });
  geo.center();
  return geo;
}

function createParticles() {
  const particleGeo = new THREE.SphereGeometry(0.08, 8, 8);
  for (let i = 0; i < 30; i++) {
    const mat = new THREE.MeshBasicMaterial({ 
      color: i % 2 === 0 ? 0xec4899 : 0x8b5cf6,
      transparent: true,
      opacity: 0.4
    });
    const p = new THREE.Mesh(particleGeo, mat);
    p.position.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 5
    );
    p.speed = 0.005 + Math.random() * 0.01;
    avatarScene.add(p);
    particles.push(p);
  }
}

// ============ MODULE LOADING ============
async function loadModule(module) {
  currentModule = module;
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  document.getElementById(`module-${module}`).classList.add('active');
  
  // Load module data
  switch(module) {
    case 'dashboard': loadDashboard(); break;
    case 'fotos': loadFotos(); break;
    case 'videos': loadVideos(); break;
    case 'momentos': loadMomentos(); break;
    case 'cartao': loadCartao(); break;
    case 'contrato': loadContrato(); break;
    case 'acordos': loadAcordos(); break;
    case 'proibicoes': loadProibicoes(); break;
    case 'metas': loadMetas(); break;
    case 'sonhos': loadSonhos(); break;
    case 'gastos': loadGastos(); break;
    case 'recibos': loadRecibos(); break;
    case 'agenda': loadAgenda(); break;
    case 'dicas': loadDicas(); break;
    case 'redes': loadRedes(); break;
    case 'sobre': loadSobre(); break;
    case 'proximidade': loadProximidade(); break;
    case 'config': loadConfig(); break;
  }
}

// ============ MODULE: DASHBOARD ============
async function loadDashboard() {
  const [fotos, metas, agenda] = await Promise.all([
    api('/api/fotos'),
    api('/api/metas'),
    api('/api/agenda')
  ]);
  document.getElementById('statFotos').textContent = fotos?.length || 0;
  document.getElementById('statMetas').textContent = metas?.filter(m => m.status !== 'concluida').length || 0;
  document.getElementById('statTime').textContent = timeTogether(coupleConfig.dataInicio);
  
  // Próxima data
  const now = new Date();
  const future = agenda?.filter(a => new Date(a.data) >= now).sort((a,b) => new Date(a.data) - new Date(b.data))[0];
  document.getElementById('statProxData').textContent = future ? formatDate(future.data) + ' - ' + future.titulo : 'Nenhuma';
  
  // Próximos eventos
  const dashAgenda = document.getElementById('dashAgenda');
  dashAgenda.innerHTML = agenda?.slice(0,5).map(a => `
    <div class="list-item" style="padding:10px;margin:8px 0;">
      <div class="list-item-content">
        <div class="list-item-title">${a.titulo}</div>
        <div class="list-item-desc">${formatDate(a.data)} · ${a.tipo}</div>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center">Nenhum evento</p>';
  
  // Metas em andamento
  const dashMetas = document.getElementById('dashMetas');
  dashMetas.innerHTML = metas?.filter(m => m.status !== 'concluida').slice(0,3).map(m => `
    <div class="list-item" style="padding:10px;margin:8px 0;">
      <div class="list-item-content">
        <div class="list-item-title">${m.titulo}</div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${m.progresso||0}%"></div></div>
        <div class="list-item-desc">${m.progresso||0}% · ${formatDate(m.prazo)}</div>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center">Nenhuma meta</p>';
}

// ============ MODULE: FOTOS ============
async function loadFotos() {
  const fotos = await api('/api/fotos');
  const grid = document.getElementById('fotosGrid');
  grid.innerHTML = fotos?.map(f => `
    <div class="photo-card" onclick="window.open('${f.arquivo}','_blank')">
      <img src="${f.arquivo}" alt="${f.titulo}" loading="lazy">
      <div class="photo-overlay">${f.titulo || 'Sem título'}</div>
      <button class="photo-delete" onclick="event.stopPropagation();deleteItem('/api/fotos/${f.id}', loadFotos)">×</button>
    </div>
  `).join('') || '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nenhuma foto ainda</p>';
}

async function addFoto() {
  const file = document.getElementById('fotoFile').files[0];
  const titulo = document.getElementById('fotoTitulo').value;
  const descricao = document.getElementById('fotoDesc').value;
  if (!file) return showToast('Selecione uma imagem', 'error');
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const res = await api('/api/fotos', { 
      method: 'POST', 
      body: JSON.stringify({ titulo, descricao, dataBase64: e.target.result }) 
    });
    if (res.id) {
      showToast('Foto adicionada!');
      document.getElementById('fotoFile').value = '';
      document.getElementById('fotoTitulo').value = '';
      document.getElementById('fotoDesc').value = '';
      loadFotos();
    }
  };
  reader.readAsDataURL(file);
}

// ============ MODULE: VIDEOS ============
async function loadVideos() {
  const videos = await api('/api/videos');
  const grid = document.getElementById('videosGrid');
  grid.innerHTML = videos?.map(v => `
    <div class="video-card">
      <video controls src="${v.arquivo}"></video>
      <div class="list-item-content" style="padding-top:10px">
        <div class="list-item-title">${v.titulo || 'Sem título'}</div>
        <div class="list-item-desc">${v.descricao || ''}</div>
      </div>
      <button class="photo-delete" style="position:relative;top:-40px;left:calc(100% - 40px)" onclick="deleteItem('/api/videos/${v.id}', loadVideos)">×</button>
    </div>
  `).join('') || '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nenhum vídeo ainda</p>';
}

async function addVideo() {
  const file = document.getElementById('videoFile').files[0];
  const titulo = document.getElementById('videoTitulo').value;
  const descricao = document.getElementById('videoDesc').value;
  if (!file) return showToast('Selecione um vídeo', 'error');
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const res = await api('/api/videos', { 
      method: 'POST', 
      body: JSON.stringify({ titulo, descricao, dataBase64: e.target.result }) 
    });
    if (res.id) {
      showToast('Vídeo adicionado!');
      document.getElementById('videoFile').value = '';
      document.getElementById('videoTitulo').value = '';
      document.getElementById('videoDesc').value = '';
      loadVideos();
    }
  };
  reader.readAsDataURL(file);
}

// ============ MODULE: MOMENTOS ============
async function loadMomentos() {
  const momentos = await api('/api/momentos');
  const container = document.getElementById('timelineMomentos');
  container.innerHTML = momentos?.map(m => `
    <div class="timeline-item">
      <div class="list-item-title">${m.titulo}</div>
      <div class="list-item-desc">${m.descricao || ''}</div>
      <div class="list-item-desc">${formatDate(m.data)}</div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="deleteItem('/api/momentos/${m.id}', loadMomentos)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="text-align:center;color:var(--text-muted);padding:40px">Nenhum momento registrado</p>';
}

async function addMomento() {
  const titulo = document.getElementById('momentoTitulo').value;
  const desc = document.getElementById('momentoDesc').value;
  const data = document.getElementById('momentoData').value;
  if (!titulo || !data) return showToast('Preencha título e data', 'error');
  
  const res = await api('/api/momentos', { method: 'POST', body: JSON.stringify({ titulo, descricao: desc, data }) });
  if (res.id) {
    showToast('Momento adicionado!');
    document.getElementById('momentoTitulo').value = '';
    document.getElementById('momentoDesc').value = '';
    document.getElementById('momentoData').value = '';
    loadMomentos();
  }
}

// ============ MODULE: CARTAO ============
async function loadCartao() {
  document.getElementById('cartaoNomeCasal').textContent = coupleConfig.nomeCasal || 'Nosso Casal';
  document.getElementById('cartaoTipo').textContent = coupleConfig.tipoRelacionamento || 'Namoro';
  document.getElementById('cartaoInicio').textContent = formatDate(coupleConfig.dataInicio);
  document.getElementById('cartaoTempo').textContent = timeTogether(coupleConfig.dataInicio);
  document.getElementById('cartaoAvatar1').textContent = coupleConfig.pessoa1?.[0]?.toUpperCase() || 'P';
  document.getElementById('cartaoAvatar2').textContent = coupleConfig.pessoa2?.[0]?.toUpperCase() || 'P';
}

// ============ MODULE: CONTRATO ============
async function loadContrato() {
  const contrato = await api('/api/contrato');
  if (contrato) {
    document.getElementById('contratoTexto').value = contrato.texto || '';
    document.getElementById('contratoTipo').value = contrato.tipo || '';
    document.getElementById('btnAssinar').textContent = contrato.assinado ? '✅ Assinado' : 'Assinar Contrato';
    document.getElementById('btnAssinar').disabled = contrato.assinado;
    document.getElementById('btnAssinar').classList.toggle('btn-success', !contrato.assinado);
    document.getElementById('btnAssinar').classList.toggle('btn-primary', contrato.assinado);
    loadRegras();
    loadQuebras();
  }
}

async function salvarContrato() {
  const res = await api('/api/contrato', { 
    method: 'PUT', 
    body: JSON.stringify({ 
      texto: document.getElementById('contratoTexto').value,
      tipo: document.getElementById('contratoTipo').value 
    }) 
  });
  if (res) showToast('Contrato salvo!');
}

async function assinarContrato() {
  const res = await api('/api/contrato', { method: 'PUT', body: JSON.stringify({ assinado: true }) });
  if (res) { showToast('Contrato assinado!'); loadContrato(); }
}

async function loadRegras() {
  const regras = (await api('/api/contrato'))?.regras || [];
  document.getElementById('regrasLista').innerHTML = regras.map(r => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${r.texto}</div>
        <div class="list-item-desc">${r.ativa ? '✅ Ativa' : '⏸️ Inativa'}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="toggleRegra(${r.id}, ${!r.ativa})">${r.ativa ? '⏸️' : '▶️'}</button>
        <button class="btn-icon" onclick="deleteItem('/api/contrato/regras/${r.id}', loadRegras)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhuma regra</p>';
}

async function addRegra() {
  const texto = document.getElementById('regraTexto').value;
  if (!texto) return showToast('Digite a regra', 'error');
  await api('/api/contrato/regras', { method: 'POST', body: JSON.stringify({ texto }) });
  showToast('Regra adicionada');
  document.getElementById('regraTexto').value = '';
  loadRegras();
}

async function toggleRegra(id, ativa) {
  await api(`/api/contrato/regras/${id}`, { method: 'PUT', body: JSON.stringify({ ativa }) });
  loadRegras();
}

async function loadQuebras() {
  const quebras = (await api('/api/contrato'))?.quebras || [];
  document.getElementById('quebrasLista').innerHTML = quebras.map(q => `
    <div class="list-item" style="border-left:4px solid var(--danger)">
      <div class="list-item-content">
        <div class="list-item-title">Regra: ${q.regraQuebrada}</div>
        <div class="list-item-desc">${q.descricao}</div>
        <div class="list-item-desc">Consequência: ${q.consequencia || 'N/A'} · ${formatDate(q.data)}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="deleteItem('/api/contrato/quebras/${q.id}', loadQuebras)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhuma quebra registrada</p>';
}

async function addQuebra() {
  const regra = document.getElementById('quebraRegra').value;
  const desc = document.getElementById('quebraDesc').value;
  const cons = document.getElementById('quebraCons').value;
  if (!regra) return showToast('Informe a regra quebrada', 'error');
  await api('/api/contrato/quebras', { method: 'POST', body: JSON.stringify({ regraQuebrada: regra, descricao: desc, consequencia: cons }) });
  showToast('Quebra registrada');
  document.getElementById('quebraRegra').value = '';
  document.getElementById('quebraDesc').value = '';
  document.getElementById('quebraCons').value = '';
  loadQuebras();
}

// ============ MODULE: ACORDOS ============
async function loadAcordos() {
  const acordos = await api('/api/acordos');
  document.getElementById('acordosLista').innerHTML = acordos?.map(a => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${a.titulo} <span class="badge badge-${a.status==='concluido'?'leve':a.status==='ativo'?'media':'warning'}">${a.status||'ativo'}</span></div>
        <div class="list-item-desc">${a.descricao}</div>
        <div class="list-item-desc">Prazo: ${formatDate(a.prazo)}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="toggleAcordo(${a.id}, '${a.status==='ativo'?'concluido':'ativo'}')">${a.status==='ativo'?'✅':'🔄'}</button>
        <button class="btn-icon" onclick="deleteItem('/api/acordos/${a.id}', loadAcordos)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhum acordo</p>';
}

async function addAcordo() {
  const titulo = document.getElementById('acordoTitulo').value;
  const desc = document.getElementById('acordoDesc').value;
  const prazo = document.getElementById('acordoPrazo').value;
  if (!titulo) return showToast('Título obrigatório', 'error');
  await api('/api/acordos', { method: 'POST', body: JSON.stringify({ titulo, descricao: desc, prazo }) });
  showToast('Acordo criado');
  document.getElementById('acordoTitulo').value = '';
  document.getElementById('acordoDesc').value = '';
  document.getElementById('acordoPrazo').value = '';
  loadAcordos();
}

async function toggleAcordo(id, status) {
  await api(`/api/acordos/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
  loadAcordos();
}

// ============ MODULE: PROIBICOES ============
async function loadProibicoes() {
  const proib = await api('/api/proibicoes');
  document.getElementById('proibicoesLista').innerHTML = proib?.map(p => `
    <div class="list-item" style="border-left:4px solid ${p.severidade==='gravissima'?'var(--danger)':p.severidade==='grave'?'var(--warning)':p.severidade==='media'?'var(--secondary)':'var(--success)'}">
      <div class="list-item-content">
        <div class="list-item-title">${p.texto}</div>
        <div class="list-item-desc"><span class="badge badge-${p.severidade}">${p.severidade.toUpperCase()}</span> · ${formatDate(p.data)}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="deleteItem('/api/proibicoes/${p.id}', loadProibicoes)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhuma proibição</p>';
}

async function addProibicao() {
  const texto = document.getElementById('proibTexto').value;
  const severidade = document.getElementById('proibSever').value;
  if (!texto) return showToast('Digite o que é proibido', 'error');
  await api('/api/proibicoes', { method: 'POST', body: JSON.stringify({ texto, severidade }) });
  showToast('Proibição adicionada');
  document.getElementById('proibTexto').value = '';
  loadProibicoes();
}

// ============ MODULE: METAS ============
async function loadMetas() {
  const metas = await api('/api/metas');
  document.getElementById('metasLista').innerHTML = metas?.map(m => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${m.titulo} <span class="badge badge-${m.status==='concluida'?'leve':'media'}">${m.status||'pendente'}</span></div>
        <div class="list-item-desc">${m.descricao}</div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${m.progresso||0}%"></div></div>
        <div class="list-item-desc">${m.progresso||0}% · Prazo: ${formatDate(m.prazo)}</div>
      </div>
      <div class="list-item-actions">
        <input type="number" min="0" max="100" value="${m.progresso||0}" style="width:60px;padding:5px;border-radius:6px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text)" onchange="updateMetaProgress(${m.id}, this.value)">
        <button class="btn-icon" onclick="toggleMeta(${m.id}, '${m.status==='pendente'?'concluida':'pendente'}')">${m.status==='pendente'?'✅':'🔄'}</button>
        <button class="btn-icon" onclick="deleteItem('/api/metas/${m.id}', loadMetas)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhuma meta</p>';
}

async function addMeta() {
  const titulo = document.getElementById('metaTitulo').value;
  const desc = document.getElementById('metaDesc').value;
  const prazo = document.getElementById('metaPrazo').value;
  if (!titulo) return showToast('Título obrigatório', 'error');
  await api('/api/metas', { method: 'POST', body: JSON.stringify({ titulo, descricao: desc, prazo }) });
  showToast('Meta criada');
  document.getElementById('metaTitulo').value = '';
  document.getElementById('metaDesc').value = '';
  document.getElementById('metaPrazo').value = '';
  loadMetas();
}

async function updateMetaProgress(id, progresso) {
  await api(`/api/metas/${id}`, { method: 'PUT', body: JSON.stringify({ progresso: parseInt(progresso), status: progresso>=100?'concluida':'pendente' }) });
  loadMetas();
}

async function toggleMeta(id, status) {
  await api(`/api/metas/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
  loadMetas();
}

// ============ MODULE: SONHOS ============
async function loadSonhos() {
  const sonhos = await api('/api/sonhos');
  document.getElementById('sonhosLista').innerHTML = sonhos?.map(s => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${s.titulo} <span class="badge badge-${s.status==='realizado'?'leve':'warning'}">${s.status||'sonhando'}</span></div>
        <div class="list-item-desc">${s.descricao}</div>
        <div class="list-item-desc">Categoria: ${s.categoria || 'geral'}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="toggleSonho(${s.id}, '${s.status==='sonhando'?'realizado':'sonhando'}')">${s.status==='sonhando'?'✨':'🔄'}</button>
        <button class="btn-icon" onclick="deleteItem('/api/sonhos/${s.id}', loadSonhos)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhum sonho</p>';
}

async function addSonho() {
  const titulo = document.getElementById('sonhoTitulo').value;
  const desc = document.getElementById('sonhoDesc').value;
  const cat = document.getElementById('sonhoCat').value;
  if (!titulo) return showToast('Título obrigatório', 'error');
  await api('/api/sonhos', { method: 'POST', body: JSON.stringify({ titulo, descricao: desc, categoria: cat }) });
  showToast('Sonho adicionado');
  document.getElementById('sonhoTitulo').value = '';
  document.getElementById('sonhoDesc').value = '';
  document.getElementById('sonhoCat').value = '';
  loadSonhos();
}

async function toggleSonho(id, status) {
  await api(`/api/sonhos/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
  loadSonhos();
}

// ============ MODULE: GASTOS ============
async function loadGastos() {
  const gastos = await api('/api/gastos');
  const total = gastos?.reduce((s, g) => s + (parseFloat(g.valor)||0), 0) || 0;
  document.getElementById('gastoTotal').textContent = total.toFixed(2).replace('.', ',');
  
  const tbody = document.getElementById('gastosTabela');
  tbody.innerHTML = `
    <thead><tr><th>Descrição</th><th>Valor</th><th>Categoria</th><th>Pago por</th><th>Data</th><th></th></tr></thead>
    <tbody>${gastos?.map(g => `
      <tr>
        <td>${g.descricao}</td>
        <td>R$ ${(parseFloat(g.valor)||0).toFixed(2).replace('.',',')}</td>
        <td>${g.categoria || '-'}</td>
        <td>${g.pagoPor || '-'}</td>
        <td>${formatDate(g.data)}</td>
        <td><button class="btn-icon" onclick="deleteItem('/api/gastos/${g.id}', loadGastos)">🗑️</button></td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">Nenhum gasto</td></tr>'}</tbody>
  `;
}

async function addGasto() {
  const desc = document.getElementById('gastoDesc').value;
  const valor = document.getElementById('gastoValor').value;
  const cat = document.getElementById('gastoCat').value;
  const pago = document.getElementById('gastoPago').value;
  if (!desc || !valor) return showToast('Descrição e valor obrigatórios', 'error');
  await api('/api/gastos', { method: 'POST', body: JSON.stringify({ descricao: desc, valor: parseFloat(valor), categoria: cat, pagoPor: pago }) });
  showToast('Gasto adicionado');
  document.getElementById('gastoDesc').value = '';
  document.getElementById('gastoValor').value = '';
  document.getElementById('gastoCat').value = '';
  loadGastos();
}

// ============ MODULE: RECIBOS ============
async function loadRecibos() {
  const recibos = await api('/api/recibos');
  document.getElementById('recibosLista').innerHTML = recibos?.map(r => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${r.tipo} - ${r.descricao}</div>
        <div class="list-item-desc">Valor: ${r.valor} · ${formatDate(r.data)}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="deleteItem('/api/recibos/${r.id}', loadRecibos)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhum recibo</p>';
}

async function addRecibo() {
  const tipo = document.getElementById('reciboTipo').value;
  const desc = document.getElementById('reciboDesc').value;
  const valor = document.getElementById('reciboValor').value;
  if (!tipo || !desc) return showToast('Tipo e descrição obrigatórios', 'error');
  await api('/api/recibos', { method: 'POST', body: JSON.stringify({ tipo, descricao: desc, valor }) });
  showToast('Recibo adicionado');
  document.getElementById('reciboTipo').value = '';
  document.getElementById('reciboDesc').value = '';
  document.getElementById('reciboValor').value = '';
  loadRecibos();
}

// ============ MODULE: AGENDA ============
async function loadAgenda() {
  const agenda = await api('/api/agenda');
  const now = new Date();
  const sorted = agenda?.sort((a,b) => new Date(a.data) - new Date(b.data)) || [];
  
  document.getElementById('agendaLista').innerHTML = sorted.map(e => `
    <div class="list-item ${new Date(e.data) < now ? 'style="opacity:0.6"' : ''}">
      <div class="list-item-content">
        <div class="list-item-title">${e.titulo} <span class="badge badge-${e.tipo==='aniversario'?'leve':e.tipo==='comemoracao'?'media':'warning'}">${e.tipo}</span></div>
        <div class="list-item-desc">${e.descricao || ''}</div>
        <div class="list-item-desc">${formatDate(e.data)} · Recorrência: ${e.recorrencia}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="deleteItem('/api/agenda/${e.id}', loadAgenda)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhum evento</p>';
}

async function addAgenda() {
  const titulo = document.getElementById('agendaTitulo').value;
  const desc = document.getElementById('agendaDesc').value;
  const data = document.getElementById('agendaData').value;
  const tipo = document.getElementById('agendaTipo').value;
  const rec = document.getElementById('agendaRec').value;
  if (!titulo || !data) return showToast('Título e data obrigatórios', 'error');
  await api('/api/agenda', { method: 'POST', body: JSON.stringify({ titulo, descricao: desc, data, tipo, recorrencia: rec }) });
  showToast('Evento adicionado');
  document.getElementById('agendaTitulo').value = '';
  document.getElementById('agendaDesc').value = '';
  document.getElementById('agendaData').value = '';
  loadAgenda();
}

// ============ MODULE: DICAS ============
async function loadDicas() {
  const dicas = await api('/api/dicas');
  document.getElementById('dicasLista').innerHTML = dicas?.map(d => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${d.titulo} <span class="badge badge-${d.categoria==='intimidade'?'leve':d.categoria==='romance'?'media':'warning'}">${d.categoria}</span></div>
        <div class="list-item-desc">${d.texto}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" onclick="deleteItem('/api/dicas/${d.id}', loadDicas)">🗑️</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhuma dica</p>';
}

async function addDica() {
  const titulo = document.getElementById('dicaTitulo').value;
  const texto = document.getElementById('dicaTexto').value;
  const cat = document.getElementById('dicaCat').value;
  if (!titulo || !texto) return showToast('Título e texto obrigatórios', 'error');
  await api('/api/dicas', { method: 'POST', body: JSON.stringify({ titulo, texto, categoria: cat }) });
  showToast('Dica adicionada');
  document.getElementById('dicaTitulo').value = '';
  document.getElementById('dicaTexto').value = '';
  loadDicas();
}

// ============ MODULE: REDES ============
async function loadRedes() {
  const redes = await api('/api/redes');
  document.getElementById('redesLista').innerHTML = redes?.map(r => `
    <div class="rede-card">
      <strong>${r.plataforma}</strong>
      <a href="${r.url}" target="_blank">${r.usuario}</a>
      <span style="margin-left:auto;color:var(--text-muted)">${r.url}</span>
      <button class="btn-icon" onclick="deleteItem('/api/redes/${r.id}', loadRedes)">🗑️</button>
    </div>
  `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhuma rede social</p>';
}

async function addRede() {
  const plataforma = document.getElementById('redePlataforma').value;
  const usuario = document.getElementById('redeUsuario').value;
  const url = document.getElementById('redeUrl').value;
  if (!plataforma || !url) return showToast('Plataforma e URL obrigatórios', 'error');
  await api('/api/redes', { method: 'POST', body: JSON.stringify({ plataforma, usuario, url }) });
  showToast('Rede adicionada');
  document.getElementById('redePlataforma').value = '';
  document.getElementById('redeUsuario').value = '';
  document.getElementById('redeUrl').value = '';
  loadRedes();
}

// ============ MODULE: SOBRE ============
async function loadSobre() {
  const sobre = await api('/api/sobre');
  document.getElementById('sobreTexto').value = sobre?.sobreNos || '';
}

async function salvarSobre() {
  await api('/api/sobre', { method: 'PUT', body: JSON.stringify({ sobreNos: document.getElementById('sobreTexto').value }) });
  showToast('História salva!');
}

// ============ MODULE: PROXIMIDADE ============
async function loadProximidade() {
  const prox = await api('/api/proximidade');
  if (prox) {
    document.getElementById('proximidadeSlider').value = prox.nivel || 50;
    document.getElementById('proximidadeValor').textContent = (prox.nivel || 50) + '%';
    document.getElementById('proximidadeStatus').textContent = prox.status || 'Conectados';
    updateCircle(prox.nivel || 50);
  }
}

function updateProximidade(val) {
  document.getElementById('proximidadeValor').textContent = val + '%';
  updateCircle(val);
}

function updateCircle(val) {
  const circle = document.getElementById('proximidadeCircle');
  circle.style.background = `conic-gradient(var(--primary) ${val}%, rgba(0,0,0,0.3) ${val}%)`;
}

async function salvarProximidade() {
  const nivel = parseInt(document.getElementById('proximidadeSlider').value);
  const status = document.getElementById('proximidadeStatus').textContent;
  await api('/api/proximidade', { method: 'PUT', body: JSON.stringify({ nivel, status }) });
  showToast('Proximidade salva!');
}

// ============ MODULE: CONFIG ============
async function loadConfig() {
  document.getElementById('cfgNomeCasal').value = coupleConfig.nomeCasal || '';
  document.getElementById('cfgPessoa1').value = coupleConfig.pessoa1 || '';
  document.getElementById('cfgPessoa2').value = coupleConfig.pessoa2 || '';
  document.getElementById('cfgTipo').value = coupleConfig.tipoRelacionamento || 'Namoro';
  document.getElementById('cfgDataInicio').value = coupleConfig.dataInicio || '';
}

async function salvarConfig() {
  const config = {
    nomeCasal: document.getElementById('cfgNomeCasal').value,
    pessoa1: document.getElementById('cfgPessoa1').value,
    pessoa2: document.getElementById('cfgPessoa2').value,
    tipoRelacionamento: document.getElementById('cfgTipo').value,
    dataInicio: document.getElementById('cfgDataInicio').value
  };
  await api('/api/config', { method: 'PUT', body: JSON.stringify(config) });
  coupleConfig = config;
  updateUI();
  loadCartao();
  showToast('Configurações salvas!');
}

// ============ GENERIC DELETE ============
async function deleteItem(url, callback) {
  if (!confirm('Tem certeza?')) return;
  await api(url, { method: 'DELETE' });
  showToast('Removido!');
  callback();
}

// ============ LOGOUT ============
async function logout() {
  await api('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

// ============ START ============
document.addEventListener('DOMContentLoaded', init);

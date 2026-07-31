# Couple Hub — Supabase Setup

## 1. CRIE SUA CONTA NO SUPABASE (GRÁTIS)

1. Acesse **https://supabase.com**
2. Clique em **"Start your project"**
3. Faça login com GitHub (ou email)
4. Crie um **New Project**:
   - Nome: `couple-hub`
   - Database Password: `CoupleHub2024!` (ou a que quiser)
   - Region: `South America (São Paulo)` ou `US East`
   - Pricing: **Free (500MB)**
5. Aguarde ~2min o banco ser criado

---

## 2. PEGUE SUAS CREDENCIAIS

No painel do Supabase, vá em **Settings → Database**:

```
Host: db.xxxxxxxxxx.supabase.co
Database name: postgres
Port: 6543
User: postgres
Password: CoupleHub2024!
```

Ou use a **Connection string** completa:

```
postgresql://postgres.nknsgzribmxarvwrcyme:CoupleHub2024!@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

---

## 3. CONFIGURE O SERVIDOR

Edite o arquivo `server.js` e adicione:

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'SUA_URL_DO_SUPABASE', // https://xxxx.supabase.co
  'SUA_ANON_KEY'         // eyJhbGciOiJI... (pegue em Settings → API)
)
```

---

## 4. RODE O PROJETO

```bash
cd login-site
npm install
node server.js
# http://localhost:3000
```

---

## 5. ESQUEMA DO BANCO

Execute o script SQL abaixo no **SQL Editor** do Supabase para criar as tabelas:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fotos table
CREATE TABLE fotos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  titulo VARCHAR(255),
  descricao TEXT,
  arquivo TEXT NOT NULL,
  data TIMESTAMP DEFAULT NOW()
);

-- Momentos table
CREATE TABLE momentos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  titulo VARCHAR(255),
  descricao TEXT,
  data TIMESTAMP DEFAULT NOW()
);

-- Metas table
CREATE TABLE metas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  prazo TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pendente',
  progresso INTEGER DEFAULT 0
);

-- Gastos table
CREATE TABLE gastos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) DEFAULT 0,
  categoria VARCHAR(100),
  pago_por VARCHAR(100),
  data TIMESTAMP DEFAULT NOW()
);

-- Contrato table
CREATE TABLE contratos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  texto TEXT,
  tipo VARCHAR(100),
  assinado BOOLEAN DEFAULT false
);

CREATE TABLE contrato_regras (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER REFERENCES contratos(id),
  texto TEXT NOT NULL,
  ativa BOOLEAN DEFAULT true
);

CREATE TABLE contrato_quebras (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER REFERENCES contratos(id),
  regra_quebrada TEXT,
  descricao TEXT,
  consequencia TEXT,
  data TIMESTAMP DEFAULT NOW()
);

-- Config table
CREATE TABLE configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  nome_casal VARCHAR(255),
  pessoa1 VARCHAR(100),
  pessoa2 VARCHAR(100),
  tipo_relacionamento VARCHAR(50) DEFAULT 'Namoro',
  data_inicio TIMESTAMP,
  cor_tema VARCHAR(7) DEFAULT '#ec4899',
  notificacoes BOOLEAN DEFAULT true,
  privacidade VARCHAR(20) DEFAULT 'privado'
);
```

---

## 6. STATUS DO PROJETO

✅ Landing page (`/`)
✅ Login page (`/login`)
✅ Cadastro page (`/cadastro`)
✅ Dashboard logado (`/app`) — 18 módulos
✅ Avatar 3D (Three.js)
✅ Autenticação (bcrypt + session)
✅ Banco de dados Supabase (PostgreSQL)
✅ Deploy grátis no GitHub Pages

---

**Direitos reservados: RUBENS PEREIRA FERNANDES**
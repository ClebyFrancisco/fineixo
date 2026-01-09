# Manual de Deploy - HostGator com CI/CD

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração Inicial](#configuração-inicial)
4. [Configuração do MongoDB](#configuração-do-mongodb)
5. [Configuração de Variáveis de Ambiente](#configuração-de-variáveis-de-ambiente)
6. [Configuração de CI/CD com GitHub Actions](#configuração-de-cicd-com-github-actions)
7. [Deploy Manual (Alternativa)](#deploy-manual-alternativa)
8. [Configuração do Next.js para Produção](#configuração-do-nextjs-para-produção)
9. [Verificação e Testes](#verificação-e-testes)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Visão Geral da Arquitetura

### Arquitetura Monolítica com Next.js

Este projeto utiliza uma **arquitetura monolítica** onde o frontend e backend estão integrados em uma única aplicação Next.js:

- **Frontend**: Next.js 14 com App Router, React 18, TypeScript e Tailwind CSS
- **Backend**: Next.js API Routes (rotas `/api/*`)
- **Banco de Dados**: MongoDB (recomendado MongoDB Atlas para produção)
- **Autenticação**: JWT (JSON Web Tokens)
- **Validação**: Zod

### Estrutura da Aplicação

```
FineixoApp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Rotas de autenticação (login/register)
│   │   ├── (dashboard)/       # Rotas do dashboard (protegidas)
│   │   └── api/               # API Routes (backend)
│   ├── components/            # Componentes React reutilizáveis
│   ├── hooks/                 # Custom hooks (useAuth)
│   ├── lib/                   # Utilitários (mongodb, jwt, utils)
│   ├── middleware/            # Middlewares (auth, subscription)
│   ├── models/                # Modelos MongoDB (Mongoose)
│   ├── services/              # Serviços (cliente API)
│   └── types/                 # Definições TypeScript
```

### Características da Arquitetura

- **SSR/SSG**: Next.js renderiza páginas no servidor quando necessário
- **API Routes**: Endpoints RESTful integrados na aplicação
- **Middleware**: Proteção de rotas e validação de autenticação
- **Conexão MongoDB**: Pool de conexões reutilizável para otimização

---

## 📦 Pré-requisitos

### Conta HostGator

- Plano de hospedagem compartilhada ou VPS com suporte a Node.js
- Acesso SSH (recomendado para melhor controle)
- Acesso ao cPanel (para configurações iniciais)

### Ferramentas Necessárias

- **Node.js**: Versão 18 ou superior
- **npm**: Gerenciador de pacotes Node.js
- **Git**: Para versionamento e CI/CD
- **MongoDB Atlas**: Conta gratuita ou paga (recomendado para produção)

### Conta GitHub

- Repositório Git configurado
- Acesso para configurar GitHub Actions (se usar CI/CD)

---

## ⚙️ Configuração Inicial

### 1. Acessar o Servidor HostGator via SSH

```bash
ssh usuario@seu-dominio.com
# ou
ssh usuario@IP_DO_SERVIDOR
```

### 2. Verificar Versão do Node.js

```bash
node --version
npm --version
```

**Nota**: Se o Node.js não estiver instalado ou estiver em versão antiga, você pode:
- Solicitar atualização ao suporte HostGator
- Usar Node Version Manager (nvm) se tiver acesso root

### 3. Criar Diretório da Aplicação

```bash
cd ~/public_html
# ou para subdomínio
cd ~/public_html/subdominio
# ou para domínio específico
cd ~/public_html/seudominio.com
```

### 4. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/myFinanceApp.git .
# ou se já existir conteúdo
git clone https://github.com/seu-usuario/myFinanceApp.git temp
mv temp/* .
mv temp/.git .
rmdir temp
```

---

## 🗄️ Configuração do MongoDB

### Opção 1: MongoDB Atlas (Recomendado)

1. **Criar Conta no MongoDB Atlas**
   - Acesse: https://www.mongodb.com/cloud/atlas
   - Crie uma conta gratuita (M0 - Free Tier)

2. **Criar Cluster**
   - Escolha a região mais próxima do seu servidor
   - Selecione o tier gratuito (M0)
   - Aguarde a criação do cluster (5-10 minutos)

3. **Configurar Acesso**
   - Vá em **Database Access** → **Add New Database User**
   - Crie um usuário com senha forte
   - Anote o usuário e senha

4. **Configurar Network Access**
   - Vá em **Network Access** → **Add IP Address**
   - Adicione o IP do servidor HostGator
   - Ou adicione `0.0.0.0/0` para permitir de qualquer lugar (menos seguro)

5. **Obter String de Conexão**
   - Vá em **Database** → **Connect** → **Connect your application**
   - Copie a connection string
   - Formato: `mongodb+srv://usuario:senha@cluster.mongodb.net/myfinanceapp?retryWrites=true&w=majority`

### Opção 2: MongoDB Local (Não Recomendado para Produção)

Se você tiver acesso root e quiser instalar MongoDB localmente:

```bash
# Instalar MongoDB (exemplo para Ubuntu/Debian)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**String de conexão local**: `mongodb://localhost:27017/myfinanceapp`

---

## 🔐 Configuração de Variáveis de Ambiente

### 1. Criar Arquivo .env.local na HostGator

```bash
cd ~/public_html/seudominio.com
nano .env.local
```

### 2. Adicionar Variáveis de Ambiente

```env
# MongoDB
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/myfinanceapp?retryWrites=true&w=majority

# JWT
JWT_SECRET=seu-secret-key-super-seguro-com-pelo-menos-32-caracteres-aleatorios-123456789
JWT_EXPIRES_IN=7d

# Next.js
NEXTAUTH_URL=https://seudominio.com
NODE_ENV=production

# Stripe (se estiver usando)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 3. Proteger o Arquivo .env.local

```bash
chmod 600 .env.local
```

**⚠️ IMPORTANTE**: 
- Nunca commite o arquivo `.env.local` no Git
- Use um JWT_SECRET forte e único em produção
- Substitua `seudominio.com` pelo seu domínio real

---

## 🚀 Configuração de CI/CD com GitHub Actions

### 1. Criar Workflow do GitHub Actions

Crie o arquivo `.github/workflows/deploy.yml` no seu repositório:

```yaml
name: Deploy to HostGator

on:
  push:
    branches:
      - main  # ou 'master' dependendo da sua branch principal
  workflow_dispatch:  # Permite execução manual

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          JWT_EXPIRES_IN: ${{ secrets.JWT_EXPIRES_IN }}
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}
          NODE_ENV: production
      
      - name: Deploy to HostGator via SSH
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.HOSTGATOR_HOST }}
          username: ${{ secrets.HOSTGATOR_USER }}
          key: ${{ secrets.HOSTGATOR_SSH_KEY }}
          port: ${{ secrets.HOSTGATOR_PORT }}
          source: ".next,public,package.json,package-lock.json,next.config.js,tsconfig.json,tailwind.config.ts,postcss.config.js"
          target: "/home/${{ secrets.HOSTGATOR_USER }}/public_html"
      
      - name: Install production dependencies on server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOSTGATOR_HOST }}
          username: ${{ secrets.HOSTGATOR_USER }}
          key: ${{ secrets.HOSTGATOR_SSH_KEY }}
          port: ${{ secrets.HOSTGATOR_PORT }}
          script: |
            cd ~/public_html
            npm ci --production
            pm2 restart myfinanceapp || pm2 start npm --name "myfinanceapp" -- start
```

### 2. Configurar Secrets no GitHub

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione os seguintes secrets:

   - `HOSTGATOR_HOST`: IP ou domínio do servidor
   - `HOSTGATOR_USER`: Usuário SSH
   - `HOSTGATOR_SSH_KEY`: Chave privada SSH
   - `HOSTGATOR_PORT`: Porta SSH (geralmente 22)
   - `MONGODB_URI`: String de conexão MongoDB
   - `JWT_SECRET`: Secret JWT
   - `JWT_EXPIRES_IN`: Tempo de expiração (ex: 7d)
   - `NEXTAUTH_URL`: URL da aplicação (ex: https://seudominio.com)

### 3. Gerar Chave SSH para GitHub Actions

No servidor HostGator:

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions  # Copie este conteúdo para o secret HOSTGATOR_SSH_KEY
```

### 4. Workflow Alternativo (Mais Simples)

Se preferir um workflow mais simples que apenas faz o build e envia os arquivos:

```yaml
name: Deploy to HostGator

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          npm ci
          npm run build
      
      - name: Deploy via rsync
        uses: burnett01/rsync-deployments@6.0.0
        with:
          switches: -avzr --delete
          path: .next,public,package.json,package-lock.json,next.config.js,tsconfig.json,tailwind.config.ts,postcss.config.js
          remote_path: /home/${{ secrets.HOSTGATOR_USER }}/public_html/
          remote_host: ${{ secrets.HOSTGATOR_HOST }}
          remote_user: ${{ secrets.HOSTGATOR_USER }}
          remote_key: ${{ secrets.HOSTGATOR_SSH_KEY }}
```

---

## 📝 Deploy Manual (Alternativa)

Se preferir fazer deploy manual sem CI/CD:

### 1. No Servidor HostGator

```bash
cd ~/public_html/seudominio.com

# Atualizar código
git pull origin main

# Instalar dependências (se necessário)
npm install --production

# Fazer build
npm run build

# Reiniciar aplicação (se usar PM2)
pm2 restart myfinanceapp
# ou
npm start
```

### 2. Usando PM2 para Gerenciar o Processo

Instalar PM2 globalmente:

```bash
npm install -g pm2
```

Criar arquivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'myfinanceapp',
    script: 'npm',
    args: 'start',
    cwd: '/home/usuario/public_html',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Iniciar com PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Configurar para iniciar automaticamente
```

---

## ⚙️ Configuração do Next.js para Produção

### 1. Atualizar next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Opcional: para otimização
  // Se usar domínio customizado
  // basePath: '', // Se necessário
  // trailingSlash: true, // Se necessário
}

module.exports = nextConfig
```

### 2. Configurar Process Manager (PM2)

Criar `ecosystem.config.js` na raiz:

```javascript
module.exports = {
  apps: [{
    name: 'myfinanceapp',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/usuario/public_html',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### 3. Configurar Proxy Reverso (se necessário)

Se a HostGator usar Apache, você pode precisar configurar um `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Proxy para aplicação Next.js na porta 3000
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
</IfModule>
```

Ou configurar no cPanel:
- **Advanced** → **Apache Modules** → Habilitar `mod_proxy` e `mod_proxy_http`
- **Subdomains** ou **Addon Domains** → Configurar document root

---

## ✅ Verificação e Testes

### 1. Verificar Build

```bash
npm run build
```

Deve compilar sem erros.

### 2. Testar Aplicação Localmente

```bash
npm start
```

Acesse `http://localhost:3000` e verifique se está funcionando.

### 3. Verificar Logs

```bash
# Se usar PM2
pm2 logs myfinanceapp

# Ou verificar logs do sistema
tail -f /var/log/apache2/error.log  # Apache
# ou
journalctl -u nodejs -f  # Systemd
```

### 4. Testar Endpoints da API

```bash
# Testar autenticação
curl -X POST https://seudominio.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@teste.com","password":"senha123"}'

# Testar login
curl -X POST https://seudominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"senha123"}'
```

### 5. Verificar Variáveis de Ambiente

```bash
# No servidor
cd ~/public_html
node -e "require('dotenv').config({path: '.env.local'}); console.log(process.env.MONGODB_URI)"
```

---

## 🔧 Troubleshooting

### Problema: Build falha

**Solução**:
```bash
# Limpar cache e node_modules
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Problema: Erro de conexão com MongoDB

**Solução**:
1. Verificar se a string de conexão está correta
2. Verificar se o IP está liberado no MongoDB Atlas
3. Testar conexão manualmente:
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect('SUA_URI').then(() => console.log('Conectado!')).catch(e => console.error(e))"
```

### Problema: Aplicação não inicia

**Solução**:
```bash
# Verificar se a porta está em uso
netstat -tulpn | grep 3000

# Verificar logs
pm2 logs myfinanceapp

# Reiniciar
pm2 restart myfinanceapp
```

### Problema: Erro 502 Bad Gateway

**Solução**:
1. Verificar se a aplicação está rodando: `pm2 list`
2. Verificar se o proxy reverso está configurado corretamente
3. Verificar logs do Apache/Nginx

### Problema: Variáveis de ambiente não carregam

**Solução**:
1. Verificar se `.env.local` existe e tem permissões corretas
2. Verificar se as variáveis estão no formato correto
3. Reiniciar a aplicação após alterar `.env.local`

### Problema: Erro de memória durante build

**Solução**:
```bash
# Aumentar memória do Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Problema: GitHub Actions falha no deploy

**Solução**:
1. Verificar se todos os secrets estão configurados
2. Verificar se a chave SSH está correta
3. Verificar logs do GitHub Actions para mais detalhes
4. Testar conexão SSH manualmente:
```bash
ssh -i ~/.ssh/github_actions usuario@hostgator.com
```

---

## 📚 Recursos Adicionais

### Comandos Úteis

```bash
# Ver processos Node.js
ps aux | grep node

# Ver uso de memória
free -h

# Ver espaço em disco
df -h

# Verificar status do PM2
pm2 status
pm2 monit

# Reiniciar aplicação
pm2 restart myfinanceapp

# Parar aplicação
pm2 stop myfinanceapp

# Ver logs em tempo real
pm2 logs myfinanceapp --lines 100
```

### Monitoramento

Considere usar:
- **PM2 Plus**: Monitoramento gratuito do PM2
- **Uptime Robot**: Monitoramento de uptime
- **Sentry**: Monitoramento de erros (opcional)

### Backup

Configure backups regulares:
```bash
# Backup do banco de dados (MongoDB Atlas tem backup automático)
# Backup do código
tar -czf backup-$(date +%Y%m%d).tar.gz ~/public_html
```

---

## 🔒 Segurança

### Checklist de Segurança

- [ ] JWT_SECRET forte e único
- [ ] `.env.local` com permissões 600
- [ ] MongoDB com IP whitelist configurado
- [ ] HTTPS habilitado (certificado SSL)
- [ ] Senhas fortes para todos os serviços
- [ ] Firewall configurado (se possível)
- [ ] Atualizações de segurança aplicadas
- [ ] Logs de erro não expõem informações sensíveis

### Certificado SSL

Configure SSL no cPanel:
1. **SSL/TLS Status** → Instalar certificado Let's Encrypt (gratuito)
2. Ou usar certificado próprio
3. Forçar HTTPS no `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## 📞 Suporte

- **HostGator Support**: https://www.hostgator.com/support
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/

---

**Última atualização**: 2024



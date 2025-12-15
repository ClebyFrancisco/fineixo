# MyFinanceApp - Gestão Financeira Pessoal

Aplicação web mobile fullstack para gestão completa de finanças pessoais, desenvolvida com Next.js, TypeScript e MongoDB.

## 🚀 Stack Tecnológica

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB com Mongoose
- **Autenticação**: JWT (JSON Web Tokens)
- **Validação**: Zod

## 📋 Funcionalidades

### 1. Gerenciamento de Entidades
- ✅ Cartões de crédito (com limite disponível e melhor dia de compra)
- ✅ Contas bancárias
- ✅ Carteiras
- ✅ Investimentos
- ✅ Dívidas (unitárias, mensais, parceladas)

### 2. Gerenciamento de Dívidas
- ✅ Cadastro de dívidas unitárias
- ✅ Cadastro de dívidas mensais de cartões
- ✅ Cadastro de dívidas parceladas
- ✅ Visualização de dívidas por cartão e mês
- ✅ Resumo total de dívidas

### 3. Grupos e Categorias
- ✅ Cadastro, edição e remoção de categorias
- ✅ Associação de dívidas a categorias
- ✅ Categoria padrão "Avulsas"

### 4. Autenticação
- ✅ Registro de usuários
- ✅ Login com JWT
- ✅ Proteção de rotas

## 🛠️ Instalação

### Pré-requisitos
- Node.js 18+ instalado
- Docker Desktop instalado e rodando

### Opção 1: Instalação Rápida com Docker (Recomendado)

1. Clone o repositório:
```bash
git clone <repository-url>
cd myFinanceApp
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o MongoDB com Docker:
```bash
npm run docker:up
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse a aplicação:
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

**Ou use o script automatizado (Windows):**
```powershell
.\start.ps1
```

**Ou use o script automatizado (Linux/Mac):**
```bash
chmod +x start.sh
./start.sh
```

### Opção 2: MongoDB Local (sem Docker)

1. Instale o MongoDB localmente
2. Configure o arquivo `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/myfinanceapp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=http://localhost:3000
```

3. Execute:
```bash
npm install
npm run dev
```

### Comandos Docker Úteis

```bash
# Iniciar MongoDB
npm run docker:up

# Ver logs do MongoDB
npm run docker:logs

# Parar MongoDB
npm run docker:down

# Reiniciar MongoDB
npm run docker:restart
```

Para mais detalhes sobre Docker, consulte [DOCKER.md](./DOCKER.md)

## 📁 Estrutura do Projeto

```
myFinanceApp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Rotas de autenticação
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/       # Rotas do dashboard
│   │   │   └── dashboard/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Autenticação
│   │   │   ├── credit-cards/  # Cartões de crédito
│   │   │   ├── accounts/      # Contas bancárias
│   │   │   ├── wallets/       # Carteiras
│   │   │   ├── investments/   # Investimentos
│   │   │   ├── debts/         # Dívidas
│   │   │   └── categories/     # Categorias
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # Componentes React
│   ├── hooks/                 # Custom hooks (useAuth)
│   ├── lib/                   # Utilitários
│   │   ├── mongodb.ts         # Conexão MongoDB
│   │   ├── jwt.ts             # JWT helpers
│   │   └── utils.ts           # Funções utilitárias
│   ├── middleware/            # Middlewares
│   │   └── auth.ts            # Autenticação
│   ├── models/                # Modelos MongoDB
│   │   ├── User.ts
│   │   ├── CreditCard.ts
│   │   ├── Account.ts
│   │   ├── Wallet.ts
│   │   ├── Investment.ts
│   │   ├── Debt.ts
│   │   └── Category.ts
│   ├── services/              # Serviços
│   │   └── api.ts             # Cliente API
│   └── types/                 # TypeScript types
│       └── index.ts
├── public/                    # Arquivos estáticos
├── .env.local                 # Variáveis de ambiente (não commitado)
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

## 🔐 Autenticação

A aplicação utiliza JWT para autenticação. O token é armazenado no `localStorage` do navegador e enviado em todas as requisições através do header `Authorization: Bearer <token>`.

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Obter dados do usuário autenticado

### Cartões de Crédito
- `GET /api/credit-cards` - Listar cartões
- `POST /api/credit-cards` - Criar cartão
- `GET /api/credit-cards/[id]` - Obter cartão
- `PUT /api/credit-cards/[id]` - Atualizar cartão
- `DELETE /api/credit-cards/[id]` - Remover cartão

### Contas Bancárias
- `GET /api/accounts` - Listar contas
- `POST /api/accounts` - Criar conta
- `GET /api/accounts/[id]` - Obter conta
- `PUT /api/accounts/[id]` - Atualizar conta
- `DELETE /api/accounts/[id]` - Remover conta

### Carteiras
- `GET /api/wallets` - Listar carteiras
- `POST /api/wallets` - Criar carteira
- `GET /api/wallets/[id]` - Obter carteira
- `PUT /api/wallets/[id]` - Atualizar carteira
- `DELETE /api/wallets/[id]` - Remover carteira

### Investimentos
- `GET /api/investments` - Listar investimentos
- `POST /api/investments` - Criar investimento
- `GET /api/investments/[id]` - Obter investimento
- `PUT /api/investments/[id]` - Atualizar investimento
- `DELETE /api/investments/[id]` - Remover investimento

### Dívidas
- `GET /api/debts` - Listar dívidas (com filtros: creditCardId, month, paid)
- `POST /api/debts` - Criar dívida
- `GET /api/debts/[id]` - Obter dívida
- `PUT /api/debts/[id]` - Atualizar dívida
- `DELETE /api/debts/[id]` - Remover dívida
- `GET /api/debts/summary` - Resumo de dívidas

### Categorias
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria
- `GET /api/categories/[id]` - Obter categoria
- `PUT /api/categories/[id]` - Atualizar categoria
- `DELETE /api/categories/[id]` - Remover categoria

## 🎨 Próximos Passos

- [ ] Implementar painel administrativo completo
- [ ] Adicionar dashboards com gráficos
- [ ] Implementar exportação de dados (Excel/CSV)
- [ ] Adicionar notificações de vencimento
- [ ] Implementar relatórios financeiros
- [ ] Adicionar testes unitários e de integração
- [ ] Implementar PWA para uso mobile

## 📝 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.




# Guia de Instalação e Configuração

## Pré-requisitos

- Node.js 18+ instalado
- MongoDB instalado localmente ou conta no MongoDB Atlas
- npm ou yarn

## Passo a Passo

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```env
# MongoDB
# Para MongoDB local:
MONGODB_URI=mongodb://localhost:27017/myfinanceapp

# Para MongoDB Atlas:
# MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/myfinanceapp

# JWT
JWT_SECRET=seu-secret-key-super-seguro-aqui-mude-em-producao
JWT_EXPIRES_IN=7d

# Next.js
NEXTAUTH_URL=http://localhost:3000
```

**⚠️ IMPORTANTE**: 
- Altere o `JWT_SECRET` para uma string aleatória e segura em produção
- Use uma string longa e complexa (mínimo 32 caracteres recomendado)

### 3. Iniciar MongoDB (se usando localmente)

**Windows:**
```bash
# Se MongoDB estiver instalado como serviço, já estará rodando
# Caso contrário, inicie manualmente:
mongod
```

**Linux/Mac:**
```bash
sudo systemctl start mongod
# ou
mongod
```

### 4. Executar a Aplicação

```bash
npm run dev
```

A aplicação estará disponível em: [http://localhost:3000](http://localhost:3000)

## Estrutura de Banco de Dados

O MongoDB criará automaticamente as seguintes coleções:

- `users` - Usuários do sistema
- `creditcards` - Cartões de crédito
- `accounts` - Contas bancárias
- `wallets` - Carteiras
- `investments` - Investimentos
- `debts` - Dívidas
- `categories` - Categorias

## Primeiro Acesso

1. Acesse [http://localhost:3000](http://localhost:3000)
2. Clique em "Criar uma nova conta"
3. Preencha os dados de registro
4. Você será redirecionado para o dashboard

## Comandos Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter

## Troubleshooting

### Erro de Conexão com MongoDB

- Verifique se o MongoDB está rodando
- Confirme se a URI no `.env.local` está correta
- Para MongoDB Atlas, verifique se o IP está liberado no firewall

### Erro de Autenticação JWT

- Verifique se o `JWT_SECRET` está definido no `.env.local`
- Certifique-se de que o arquivo `.env.local` está na raiz do projeto

### Porta 3000 já em uso

- Altere a porta no comando: `npm run dev -- -p 3001`
- Ou pare o processo que está usando a porta 3000

## Próximos Passos

Após a instalação, você pode:

1. Criar seu primeiro cartão de crédito
2. Cadastrar contas bancárias
3. Criar categorias para organizar seus gastos
4. Adicionar dívidas e acompanhar seus vencimentos
5. Visualizar o dashboard com resumo financeiro
















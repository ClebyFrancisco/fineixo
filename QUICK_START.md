# 🚀 Guia Rápido de Início

## Status Atual

✅ **MongoDB está rodando no Docker**
✅ **Aplicação Next.js está iniciando**

## Acessar a Aplicação

Abra seu navegador e acesse: **http://localhost:3000**

## Primeiro Uso

1. **Criar uma conta:**
   - Clique em "Criar uma nova conta"
   - Preencha: Nome, Email e Senha (mínimo 6 caracteres)
   - Clique em "Criar conta"

2. **Fazer Login:**
   - Use o email e senha cadastrados
   - Você será redirecionado para o Dashboard

## Comandos Úteis

### Gerenciar MongoDB (Docker)

```bash
# Ver status
docker ps

# Ver logs
npm run docker:logs

# Parar MongoDB
npm run docker:down

# Reiniciar MongoDB
npm run docker:restart
```

### Gerenciar Aplicação

```bash
# Iniciar aplicação
npm run dev

# Build de produção
npm run build

# Executar produção
npm start
```

## Estrutura de URLs

- **Login:** http://localhost:3000/login
- **Registro:** http://localhost:3000/register
- **Dashboard:** http://localhost:3000/dashboard
- **Cartões:** http://localhost:3000/dashboard/credit-cards
- **Dívidas:** http://localhost:3000/dashboard/debts
- **Categorias:** http://localhost:3000/dashboard/categories
- **Contas:** http://localhost:3000/dashboard/accounts

## Solução de Problemas

### Aplicação não carrega

1. Verifique se o MongoDB está rodando:
   ```bash
   docker ps
   ```

2. Verifique os logs do Next.js no terminal

3. Verifique se a porta 3000 está livre

### Erro de conexão com MongoDB

1. Verifique se o Docker está rodando
2. Reinicie o MongoDB:
   ```bash
   npm run docker:restart
   ```

3. Verifique os logs:
   ```bash
   npm run docker:logs
   ```

### Limpar tudo e começar do zero

```bash
# Parar tudo
docker-compose down -v
npm run docker:up

# Aguardar 5 segundos
npm run dev
```

## Próximos Passos

Após fazer login, você pode:

1. ✅ Criar cartões de crédito
2. ✅ Cadastrar contas bancárias
3. ✅ Criar categorias
4. ✅ Adicionar dívidas
5. ✅ Visualizar dashboard com resumo

---

**Dúvidas?** Consulte o [README.md](./README.md) ou [DOCKER.md](./DOCKER.md)


















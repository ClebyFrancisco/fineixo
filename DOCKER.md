# Configuração com Docker

Este projeto utiliza Docker para facilitar a configuração do banco de dados MongoDB.

## Pré-requisitos

- Docker Desktop instalado e rodando
- Node.js 18+ instalado

## Iniciando o MongoDB com Docker

### Opção 1: Usando scripts npm

```bash
# Iniciar o MongoDB
npm run docker:up

# Ver logs do MongoDB
npm run docker:logs

# Parar o MongoDB
npm run docker:down

# Reiniciar o MongoDB
npm run docker:restart
```

### Opção 2: Usando docker-compose diretamente

```bash
# Iniciar o MongoDB
docker-compose up -d

# Ver logs
docker-compose logs -f mongodb

# Parar o MongoDB
docker-compose down

# Parar e remover volumes (limpar dados)
docker-compose down -v
```

## Configuração do .env.local

O arquivo `.env.local` já está configurado para usar o MongoDB do Docker:

```env
MONGODB_URI=mongodb://localhost:27017/myfinanceapp
JWT_SECRET=myfinanceapp-super-secret-jwt-key-change-in-production-123456789
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=http://localhost:3000
```

## Iniciando a Aplicação Completa

1. **Iniciar o MongoDB:**
   ```bash
   npm run docker:up
   ```

2. **Aguardar alguns segundos** para o MongoDB inicializar

3. **Iniciar a aplicação Next.js:**
   ```bash
   npm run dev
   ```

4. **Acessar:** http://localhost:3000

## Verificando se o MongoDB está rodando

```bash
# Verificar containers rodando
docker ps

# Verificar logs do MongoDB
docker-compose logs mongodb

# Testar conexão (se tiver mongosh instalado)
mongosh mongodb://localhost:27017/myfinanceapp
```

## Solução de Problemas

### MongoDB não inicia

- Verifique se a porta 27017 está livre
- Verifique os logs: `docker-compose logs mongodb`
- Tente reiniciar: `docker-compose restart mongodb`

### Erro de conexão

- Certifique-se de que o Docker está rodando
- Verifique se o container está ativo: `docker ps`
- Verifique se a URI no `.env.local` está correta

### Limpar tudo e começar do zero

```bash
# Parar e remover containers e volumes
docker-compose down -v

# Iniciar novamente
docker-compose up -d
```

## Dados Persistidos

Os dados do MongoDB são persistidos em um volume Docker chamado `mongodb_data`. Mesmo que você pare o container, os dados serão mantidos.

Para remover todos os dados:

```bash
docker-compose down -v
```


















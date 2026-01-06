#!/bin/bash

# Script Bash para iniciar a aplicação completa

echo "🚀 Iniciando MyFinanceApp..."

# Verificar se Docker está rodando
echo "📦 Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker."
    exit 1
fi

# Iniciar MongoDB
echo "🗄️  Iniciando MongoDB..."
docker-compose up -d

# Aguardar MongoDB inicializar
echo "⏳ Aguardando MongoDB inicializar (5 segundos)..."
sleep 5

# Verificar se MongoDB está rodando
if docker ps --filter "name=myfinanceapp-mongodb" --format "{{.Status}}" | grep -q "Up"; then
    echo "✅ MongoDB está rodando!"
else
    echo "⚠️  MongoDB pode não estar pronto ainda. Verifique os logs com: docker-compose logs mongodb"
fi

# Verificar se .env.local existe
if [ ! -f .env.local ]; then
    echo "📝 Criando arquivo .env.local..."
    cat > .env.local << EOF
MONGODB_URI=mongodb://localhost:27017/myfinanceapp
JWT_SECRET=myfinanceapp-super-secret-jwt-key-change-in-production-123456789
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=http://localhost:3000
EOF
    echo "✅ Arquivo .env.local criado!"
fi

# Iniciar aplicação Next.js
echo "🌐 Iniciando aplicação Next.js..."
echo "📱 A aplicação estará disponível em: http://localhost:3000"
echo ""

npm run dev

















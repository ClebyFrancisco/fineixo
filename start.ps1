# Script PowerShell para iniciar a aplicação completa

Write-Host "🚀 Iniciando MyFinanceApp..." -ForegroundColor Green

# Verificar se Docker está rodando
Write-Host "📦 Verificando Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker não está rodando. Por favor, inicie o Docker Desktop." -ForegroundColor Red
    exit 1
}

# Iniciar MongoDB
Write-Host "🗄️  Iniciando MongoDB..." -ForegroundColor Yellow
docker-compose up -d

# Aguardar MongoDB inicializar
Write-Host "⏳ Aguardando MongoDB inicializar (5 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar se MongoDB está rodando
$mongoStatus = docker ps --filter "name=myfinanceapp-mongodb" --format "{{.Status}}"
if ($mongoStatus -like "*Up*") {
    Write-Host "✅ MongoDB está rodando!" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB pode não estar pronto ainda. Verifique os logs com: docker-compose logs mongodb" -ForegroundColor Yellow
}

# Verificar se .env.local existe
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Criando arquivo .env.local..." -ForegroundColor Yellow
    @"
MONGODB_URI=mongodb://localhost:27017/myfinanceapp
JWT_SECRET=myfinanceapp-super-secret-jwt-key-change-in-production-123456789
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=http://localhost:3000
"@ | Out-File -FilePath .env.local -Encoding utf8
    Write-Host "✅ Arquivo .env.local criado!" -ForegroundColor Green
}

# Iniciar aplicação Next.js
Write-Host "🌐 Iniciando aplicação Next.js..." -ForegroundColor Yellow
Write-Host "📱 A aplicação estará disponível em: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

npm run dev

















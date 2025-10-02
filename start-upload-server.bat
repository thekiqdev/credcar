@echo off
echo 🚀 Iniciando servidor de upload CredCar Finance...

REM Verificar se o Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado. Instale o Node.js primeiro.
    pause
    exit /b 1
)

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    npm install --package-lock-only
    npm install express multer cors helmet morgan
)

REM Iniciar servidor
echo ✅ Iniciando servidor na porta 3001...
node upload-server.js

pause

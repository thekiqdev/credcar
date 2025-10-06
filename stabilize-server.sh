#!/bin/bash

# Script para estabilizar o servidor
echo "🛠️ ESTABILIZANDO SERVIDOR"
echo "========================="

# 1. Parar todos os processos
echo "🛑 Parando todos os processos..."
pm2 stop all

# 2. Limpar processos órfãos
echo "🧹 Limpando processos órfãos..."
pkill -f "upload-server"
pkill -f "node.*3001"

# 3. Verificar se a porta está livre
echo "🌐 Verificando porta 3001..."
if lsof -i :3001; then
    echo "❌ Porta 3001 ainda em uso"
    echo "🔄 Forçando liberação..."
    fuser -k 3001/tcp
    sleep 2
else
    echo "✅ Porta 3001 livre"
fi

# 4. Verificar sintaxe do arquivo
echo "📄 Verificando sintaxe..."
if node -c upload-server.js; then
    echo "✅ Sintaxe OK"
else
    echo "❌ Erro de sintaxe no upload-server.js"
    exit 1
fi

# 5. Iniciar apenas o upload server
echo "🚀 Iniciando upload server..."
pm2 start upload-server.js --name "upload-server-stable"

# 6. Aguardar estabilização
echo "⏳ Aguardando estabilização (10 segundos)..."
sleep 10

# 7. Verificar status
echo "📊 Status após estabilização:"
pm2 status

# 8. Testar endpoint
echo "🧪 Testando endpoint..."
if curl -s http://localhost:3001/api/health; then
    echo "✅ Servidor respondendo"
else
    echo "❌ Servidor não está respondendo"
fi

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Monitorar logs: pm2 logs upload-server-stable"
echo "2. Se estabilizar, iniciar outros serviços"
echo "3. Se continuar reiniciando, verificar código"

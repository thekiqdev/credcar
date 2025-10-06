#!/bin/bash

# Script para forçar atualização completa do sistema
echo "🚀 ATUALIZAÇÃO COMPLETA DO SISTEMA"
echo "=================================="

# 1. Atualizar código
echo "📥 Atualizando código..."
git pull origin deploy-v1.2

# 2. Verificar se upload.service.ts foi atualizado
echo "🔍 Verificando upload.service.ts..."
if grep -q "hostname === 'sistema.credcarmultimarcas.com.br'" src/lib/upload.service.ts; then
    echo "✅ Upload service atualizado"
else
    echo "❌ Upload service não foi atualizado - forçando atualização..."
    # Forçar atualização do arquivo
    git checkout HEAD -- src/lib/upload.service.ts
fi

# 3. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 4. Limpar cache e fazer build
echo "🧹 Limpando cache e fazendo build..."
rm -rf dist
rm -rf node_modules/.vite
npm run build

# 5. Verificar se build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build falhou"
    exit 1
fi

echo "✅ Build concluído com sucesso"

# 6. Reiniciar serviços
echo "🔄 Reiniciando serviços..."
pm2 restart all

# 7. Verificar status
echo "📊 Status dos serviços:"
pm2 status

# 8. Testar endpoints
echo "🧪 Testando endpoints..."
echo "Upload server direto:"
curl -s http://localhost:3001/api/health | head -1

echo "Proxy Nginx:"
curl -s https://sistema.credcarmultimarcas.com.br/api/health | head -1

echo ""
echo "✅ Atualização completa concluída!"
echo "🌐 Acesse: https://sistema.credcarmultimarcas.com.br"
echo "🧪 Teste o ASAAS em: Configurações > Pagamentos"

#!/bin/bash

# Script para diagnosticar e corrigir problema de upload service
echo "🔍 DIAGNÓSTICO UPLOAD SERVICE"
echo "============================="

# 1. Verificar se o arquivo foi atualizado
echo "📋 Verificando arquivo upload.service.ts..."
if grep -q "hostname === 'sistema.credcarmultimarcas.com.br'" src/lib/upload.service.ts; then
    echo "✅ Upload service já foi atualizado"
else
    echo "❌ Upload service precisa ser atualizado"
fi

# 2. Mostrar conteúdo atual
echo "📊 Conteúdo atual do upload.service.ts:"
grep -A 10 -B 5 "constructor()" src/lib/upload.service.ts

# 3. Verificar se há cache do build
echo "📦 Verificando se precisa fazer novo build..."
if [ -d "dist" ]; then
    echo "📁 Diretório dist existe"
    echo "📅 Última modificação do upload.service.ts:"
    ls -la src/lib/upload.service.ts
    echo "📅 Última modificação do build:"
    ls -la dist/assets/ | head -3
else
    echo "❌ Diretório dist não existe - precisa fazer build"
fi

# 4. Verificar se o upload server está rodando
echo "🚀 Verificando upload server..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Upload server está rodando"
    curl -s http://localhost:3001/api/health
else
    echo "❌ Upload server não está respondendo"
fi

# 5. Verificar proxy Nginx
echo "🌐 Verificando proxy Nginx..."
if curl -s https://sistema.credcarmultimarcas.com.br/api/health > /dev/null; then
    echo "✅ Proxy Nginx funcionando"
    curl -s https://sistema.credcarmultimarcas.com.br/api/health
else
    echo "❌ Proxy Nginx não está funcionando"
fi

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Se upload.service.ts não foi atualizado, execute: git pull origin deploy-v1.2"
echo "2. Se precisa fazer build, execute: npm run build"
echo "3. Se upload server não está rodando, execute: pm2 restart credcar-upload-server"
echo "4. Se proxy não funciona, verifique configuração Nginx"

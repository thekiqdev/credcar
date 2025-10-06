#!/bin/bash

# Script para verificar configurações que podem causar reinícios
echo "🔧 VERIFICAÇÃO DE CONFIGURAÇÕES PROBLEMÁTICAS"
echo "============================================="

# 1. Verificar se há múltiplos processos na mesma porta
echo "🌐 Verificando portas em uso:"
netstat -tlnp | grep -E "(3001|80|443)"

# 2. Verificar configuração do PM2
echo ""
echo "📋 Configuração atual do PM2:"
pm2 list

# 3. Verificar se há processos duplicados
echo ""
echo "🔄 Processos duplicados:"
ps aux | grep "upload-server" | grep -v grep

# 4. Verificar logs de erro específicos
echo ""
echo "❌ Logs de erro (últimas 15 linhas):"
pm2 logs credcar-upload-server --err --lines 15

# 5. Verificar se o arquivo upload-server.js tem problemas
echo ""
echo "📄 Verificando sintaxe do upload-server.js:"
node -c upload-server.js && echo "✅ Sintaxe OK" || echo "❌ Erro de sintaxe"

# 6. Verificar dependências
echo ""
echo "📦 Verificando dependências críticas:"
npm list node-fetch express multer

# 7. Verificar se há problemas de permissão
echo ""
echo "🔐 Verificando permissões:"
ls -la upload-server.js
ls -la documentos/

# 8. Verificar configuração do Nginx
echo ""
echo "⚙️ Testando configuração Nginx:"
nginx -t

echo ""
echo "🎯 PRINCIPAIS SUSPEITOS:"
echo "1. Múltiplos processos na porta 3001"
echo "2. Erro no código do upload-server.js"
echo "3. Problema com dependências (node-fetch)"
echo "4. Conflito de configuração PM2"
echo "5. Problema de permissões"

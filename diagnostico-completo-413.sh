#!/bin/bash

# Script de diagnóstico completo para erro 413 Request Entity Too Large
# Execute este script no servidor Hostinger VPS

echo "🔍 DIAGNÓSTICO COMPLETO - ERRO 413 REQUEST ENTITY TOO LARGE"
echo "=============================================================="

# 1. Verificar configuração atual do Nginx
echo ""
echo "📋 1. CONFIGURAÇÃO ATUAL DO NGINX:"
echo "-----------------------------------"
echo "Arquivo: /etc/nginx/sites-available/default"
echo ""

# Verificar se existe configuração para upload-document
if grep -q "location.*upload-document" /etc/nginx/sites-available/default; then
    echo "✅ Encontrado bloco location para upload-document:"
    grep -A10 -B2 "location.*upload-document" /etc/nginx/sites-available/default
else
    echo "❌ NÃO encontrado bloco location específico para upload-document"
fi

echo ""
echo "📊 Configurações de client_max_body_size encontradas:"
grep -n "client_max_body_size" /etc/nginx/sites-available/default || echo "❌ Nenhuma configuração client_max_body_size encontrada"

echo ""
echo "📊 Configurações de proxy_buffering encontradas:"
grep -n "proxy_buffering" /etc/nginx/sites-available/default || echo "❌ Nenhuma configuração proxy_buffering encontrada"

# 2. Verificar se há duplicidades
echo ""
echo "🔍 2. VERIFICANDO DUPLICIDADES:"
echo "-------------------------------"
duplicate_count=$(grep -c "location.*upload-document" /etc/nginx/sites-available/default)
echo "Número de blocos location para upload-document: $duplicate_count"

if [ $duplicate_count -gt 1 ]; then
    echo "⚠️  ATENÇÃO: Encontradas $duplicate_count configurações duplicadas!"
    echo "Isso pode causar conflitos de configuração."
else
    echo "✅ Apenas uma configuração encontrada (ou nenhuma)"
fi

# 3. Verificar configuração do Node.js
echo ""
echo "📋 3. CONFIGURAÇÃO DO BACKEND NODE.JS:"
echo "--------------------------------------"
echo "Verificando upload-server.js..."

if [ -f "upload-server.js" ]; then
    echo "✅ Arquivo upload-server.js encontrado"
    
    # Verificar limite do Multer
    fileSize_limit=$(grep -o "fileSize: [0-9]* \* 1024 \* 1024" upload-server.js | grep -o "[0-9]*")
    if [ ! -z "$fileSize_limit" ]; then
        echo "📊 Limite do Multer: ${fileSize_limit}MB"
    else
        echo "❌ Limite do Multer não encontrado"
    fi
    
    # Verificar se o servidor está rodando
    if pgrep -f "upload-server.js" > /dev/null; then
        echo "✅ Upload-server está rodando (PID: $(pgrep -f upload-server.js))"
    else
        echo "❌ Upload-server NÃO está rodando"
    fi
else
    echo "❌ Arquivo upload-server.js não encontrado"
fi

# 4. Verificar logs do Nginx
echo ""
echo "📋 4. LOGS DO NGINX (últimas 20 linhas):"
echo "----------------------------------------"
if [ -f "/var/log/nginx/error.log" ]; then
    echo "Erros do Nginx:"
    tail -20 /var/log/nginx/error.log | grep -E "(413|upload|client_max_body_size)" || echo "Nenhum erro 413 encontrado nos logs"
else
    echo "❌ Log de erro do Nginx não encontrado"
fi

# 5. Verificar logs do PM2
echo ""
echo "📋 5. LOGS DO UPLOAD-SERVER (últimas 10 linhas):"
echo "------------------------------------------------"
if command -v pm2 > /dev/null; then
    echo "Logs do upload-server:"
    pm2 logs upload-server --lines 10 --nostream 2>/dev/null || echo "❌ Não foi possível obter logs do PM2"
else
    echo "❌ PM2 não encontrado"
fi

# 6. Teste de conectividade
echo ""
echo "📋 6. TESTE DE CONECTIVIDADE:"
echo "-----------------------------"
echo "Testando conectividade com upload-server na porta 3001..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health; then
    echo "✅ Upload-server responde na porta 3001"
else
    echo "❌ Upload-server não responde na porta 3001"
fi

# 7. Verificar status do Nginx
echo ""
echo "📋 7. STATUS DO NGINX:"
echo "----------------------"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está ativo"
    
    # Testar configuração
    echo "Testando configuração do Nginx..."
    if nginx -t 2>/dev/null; then
        echo "✅ Configuração do Nginx é válida"
    else
        echo "❌ Configuração do Nginx tem erros:"
        nginx -t
    fi
else
    echo "❌ Nginx não está ativo"
fi

echo ""
echo "🎯 RESUMO DO DIAGNÓSTICO:"
echo "=========================="
echo "1. Verifique se há configuração específica para /api/upload-document"
echo "2. Verifique se client_max_body_size está configurado corretamente"
echo "3. Verifique se proxy_buffering está desabilitado"
echo "4. Verifique se upload-server está rodando"
echo "5. Verifique se não há duplicidades de configuração"
echo ""
echo "📝 Próximos passos:"
echo "   - Se não há configuração específica, execute: ./fix-nginx-exact-config.sh"
echo "   - Se há duplicidades, remova as configurações antigas"
echo "   - Se upload-server não está rodando, execute: pm2 start upload-server.js"
echo "   - Teste o upload após aplicar as correções"

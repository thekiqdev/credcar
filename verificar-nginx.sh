#!/bin/bash

# VERIFICAR CONFIGURAÇÃO DO NGINX - HOSTINGER VPS
# Execute este script para verificar se a configuração foi aplicada

echo "🔍 VERIFICANDO CONFIGURAÇÃO DO NGINX"
echo "===================================="

# 1. Verificar se a configuração existe
echo "📋 Verificando configuração de upload:"
if sudo grep -q "location = /api/upload-document" /etc/nginx/sites-available/default; then
    echo "✅ Rota /api/upload-document: CONFIGURADA"
    sudo grep -A15 "location = /api/upload-document" /etc/nginx/sites-available/default
else
    echo "❌ Rota /api/upload-document: NÃO CONFIGURADA"
fi

echo ""
echo "📋 Verificando client_max_body_size:"
if sudo grep -q "client_max_body_size 20M" /etc/nginx/sites-available/default; then
    echo "✅ client_max_body_size 20M: CONFIGURADO"
    sudo grep "client_max_body_size" /etc/nginx/sites-available/default
else
    echo "❌ client_max_body_size 20M: NÃO CONFIGURADO"
fi

echo ""
echo "📋 Verificando proxy_buffering off:"
if sudo grep -q "proxy_buffering off" /etc/nginx/sites-available/default; then
    echo "✅ proxy_buffering off: CONFIGURADO"
else
    echo "❌ proxy_buffering off: NÃO CONFIGURADO"
fi

echo ""
echo "📊 Status do Nginx:"
sudo systemctl status nginx --no-pager -l | head -5

echo ""
echo "📊 Status do PM2:"
sudo pm2 status

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "-------------------"
if sudo grep -q "location = /api/upload-document" /etc/nginx/sites-available/default; then
    echo "✅ Configuração encontrada! Teste o upload agora."
    echo "📝 Se ainda der erro 413, execute:"
    echo "   sudo nginx -s reload"
    echo "   sudo pm2 restart upload-server"
else
    echo "❌ Configuração não encontrada! Execute:"
    echo "   chmod +x fix-413-hostinger-final.sh"
    echo "   ./fix-413-hostinger-final.sh"
fi

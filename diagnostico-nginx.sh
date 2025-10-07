#!/bin/bash

# DIAGNÓSTICO DO NGINX - HOSTINGER VPS
# Execute este script para verificar a configuração atual

echo "🔍 DIAGNÓSTICO DO NGINX - HOSTINGER VPS"
echo "========================================"

# 1. Verificar configuração atual
echo "📋 Configuração atual do Nginx:"
echo "--------------------------------"
sudo cat /etc/nginx/sites-available/default | grep -A5 -B5 "client_max_body_size\|server_name.*credcarmultimarcas\|location /api"

echo ""
echo "📊 Status do Nginx:"
echo "-------------------"
sudo systemctl status nginx --no-pager -l

echo ""
echo "📊 Status do PM2:"
echo "-----------------"
sudo pm2 status

echo ""
echo "📊 Logs do Upload-Server (últimas 10 linhas):"
echo "---------------------------------------------"
sudo pm2 logs upload-server --lines 10 --nostream

echo ""
echo "🔍 Verificando se a configuração está correta:"
echo "----------------------------------------------"
if sudo grep -q "client_max_body_size 15M" /etc/nginx/sites-available/default; then
    echo "✅ client_max_body_size 15M: CONFIGURADO"
else
    echo "❌ client_max_body_size 15M: NÃO CONFIGURADO"
fi

if sudo grep -q "location /api/upload-document" /etc/nginx/sites-available/default; then
    echo "✅ location /api/upload-document: CONFIGURADO"
else
    echo "❌ location /api/upload-document: NÃO CONFIGURADO"
fi

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "-------------------"
echo "1. Se client_max_body_size não está configurado, execute:"
echo "   chmod +x fix-413-hostinger-definitivo.sh"
echo "   ./fix-413-hostinger-definitivo.sh"
echo ""
echo "2. Se já está configurado, teste o upload novamente"
echo ""
echo "3. Se ainda der erro, verifique os logs:"
echo "   sudo pm2 logs upload-server --lines 20"

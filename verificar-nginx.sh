#!/bin/bash

# VERIFICAR CONFIGURAÇÃO ATUAL DO NGINX
# Execute este comando para ver o que está configurado

echo "🔍 VERIFICANDO CONFIGURAÇÃO ATUAL DO NGINX"
echo "=========================================="

echo "📋 Configuração completa do arquivo:"
echo "------------------------------------"
sudo cat /etc/nginx/sites-available/default

echo ""
echo "📊 Apenas as linhas com 'api' e 'client_max_body_size':"
echo "------------------------------------------------------"
sudo grep -n "api\|client_max_body_size" /etc/nginx/sites-available/default

echo ""
echo "🎯 Verificando se a configuração específica existe:"
echo "---------------------------------------------------"
if sudo grep -q "location = /api/upload-document" /etc/nginx/sites-available/default; then
    echo "✅ location = /api/upload-document: ENCONTRADO"
    sudo grep -A15 "location = /api/upload-document" /etc/nginx/sites-available/default
else
    echo "❌ location = /api/upload-document: NÃO ENCONTRADO"
fi

if sudo grep -q "client_max_body_size 20M" /etc/nginx/sites-available/default; then
    echo "✅ client_max_body_size 20M: ENCONTRADO"
else
    echo "❌ client_max_body_size 20M: NÃO ENCONTRADO"
fi

echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "-------------------"
echo "1. Se não encontrou as configurações, execute:"
echo "   chmod +x fix-413-urgente.sh"
echo "   ./fix-413-urgente.sh"
echo ""
echo "2. Se encontrou, teste o upload novamente"

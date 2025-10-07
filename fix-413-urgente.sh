#!/bin/bash

# CORREÇÃO URGENTE - ERRO 413 AINDA PERSISTE
# O script anterior não aplicou a configuração corretamente

echo "🚨 CORREÇÃO URGENTE - ERRO 413 AINDA PERSISTE"
echo "============================================="

# 1. Verificar configuração atual
echo "📋 Verificando configuração atual do Nginx:"
sudo grep -A5 -B5 "location.*api\|client_max_body_size" /etc/nginx/sites-available/default

# 2. Fazer backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# 3. Limpar TODAS as configurações de API existentes
echo "🧹 Removendo TODAS as configurações de API existentes..."
sudo sed -i '/location.*\/api\//,/^[[:space:]]*}/d' /etc/nginx/sites-available/default
sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/default

# 4. Adicionar configuração CORRETA para upload-document
echo "➕ Adicionando configuração CORRETA para /api/upload-document..."

# Encontrar a linha do server_name e adicionar configuração após
sudo sed -i '/server_name.*credcarmultimarcas/a\    # Configuração específica para upload de documentos\n    location = /api/upload-document {\n        add_header X-Nginx-Location "upload-document-ACTIVE" always;\n        client_max_body_size 20M;\n        client_body_timeout 60s;\n        proxy_request_buffering off;\n        proxy_buffering off;\n        proxy_connect_timeout 60s;\n        proxy_send_timeout 60s;\n        proxy_read_timeout 60s;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n    \n    location = /api/create-folder {\n        client_max_body_size 20M;\n        client_body_timeout 60s;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-available/default

# 5. Verificar configuração final
echo "📋 Configuração final aplicada:"
sudo grep -A20 "location = /api/upload-document" /etc/nginx/sites-available/default

# 6. Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração válida!"
    
    # 7. Aplicar configuração
    echo "🔄 Recarregando Nginx..."
    sudo nginx -s reload
    
    # 8. Verificar se foi aplicado
    echo "🔍 Verificando se a configuração foi aplicada:"
    sudo grep -A5 "client_max_body_size 20M" /etc/nginx/sites-available/default
    
    # 9. Reiniciar upload-server
    echo "🔄 Reiniciando upload-server..."
    sudo pm2 restart upload-server
    
    echo ""
    echo "🎉 CORREÇÃO URGENTE APLICADA!"
    echo "============================="
    echo "✅ Nginx configurado com client_max_body_size 20M"
    echo "✅ Rota específica /api/upload-document configurada"
    echo "✅ proxy_buffering off aplicado"
    echo "✅ Upload-server reiniciado"
    echo ""
    echo "📝 TESTE AGORA: Upload do arquivo credenciamento.pdf"
    
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    echo "❌ Configuração restaurada. Verifique manualmente."
    exit 1
fi

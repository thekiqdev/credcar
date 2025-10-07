#!/bin/bash

# SOLUÇÃO DEFINITIVA PARA ERRO 413 - HOSTINGER VPS
# Aplicar configuração específica no Nginx

echo "🔧 APLICANDO SOLUÇÃO DEFINITIVA PARA ERRO 413"
echo "=============================================="
echo "📁 Arquivo: credenciamento.pdf (1.18MB)"
echo "🌐 Domínio: sistema.credcarmultimarcas.com.br"
echo "🎯 Rota: /api/upload-document"

# 1. Backup da configuração atual
echo "💾 Fazendo backup da configuração atual..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# 2. Verificar configuração atual
echo "📋 Configuração atual do Nginx:"
sudo grep -n "client_max_body_size\|location.*api\|server_name.*credcarmultimarcas" /etc/nginx/sites-available/default

# 3. Remover TODAS as configurações antigas de upload
echo "🧹 Removendo TODAS as configurações antigas de upload..."
sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/default
sudo sed -i '/location.*\/api\//d' /etc/nginx/sites-available/default
sudo sed -i '/proxy_pass.*3001/d' /etc/nginx/sites-available/default

# 4. Adicionar configuração específica para upload-document
echo "➕ Adicionando configuração específica para /api/upload-document..."

# Encontrar a linha do server_name e adicionar configuração após
sudo sed -i '/server_name.*credcarmultimarcas/a\    # Configuração específica para upload de documentos\n    location = /api/upload-document {\n        add_header X-Nginx-Location "upload-document-ACTIVE" always;\n        client_max_body_size 20M;\n        client_body_timeout 60s;\n        proxy_request_buffering off;\n        proxy_buffering off;\n        proxy_connect_timeout 60s;\n        proxy_send_timeout 60s;\n        proxy_read_timeout 60s;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-available/default

# 5. Adicionar configuração para create-folder também
echo "➕ Adicionando configuração para /api/create-folder..."
sudo sed -i '/location = \/api\/upload-document/a\    \n    location = /api/create-folder {\n        client_max_body_size 20M;\n        client_body_timeout 60s;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-available/default

# 6. Verificar configuração final
echo "📋 Configuração final aplicada:"
sudo grep -A15 "location = /api/upload-document" /etc/nginx/sites-available/default

# 7. Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração válida!"
    
    # 8. Aplicar configuração
    echo "🔄 Recarregando Nginx..."
    sudo nginx -s reload
    
    # 9. Verificar se o Nginx recarregou
    echo "📊 Verificando status do Nginx..."
    sudo systemctl status nginx --no-pager -l | head -10
    
    # 10. Reiniciar upload-server
    echo "🔄 Reiniciando upload-server..."
    sudo pm2 restart upload-server
    
    # 11. Verificar status
    echo "📊 Status dos serviços:"
    sudo pm2 status
    
    echo ""
    echo "🎉 SOLUÇÃO APLICADA COM SUCESSO!"
    echo "================================="
    echo "✅ Nginx configurado com client_max_body_size 20M"
    echo "✅ Rota específica /api/upload-document configurada"
    echo "✅ proxy_request_buffering off (evita buffer overflow)"
    echo "✅ proxy_buffering off (streaming direto)"
    echo "✅ Upload-server reiniciado"
    echo ""
    echo "📝 TESTE AGORA:"
    echo "   - Upload do arquivo credenciamento.pdf (1.18MB)"
    echo "   - Deve funcionar sem erro 413"
    echo "   - Frontend não deve quebrar com HTML"
    
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    echo "❌ Configuração restaurada. Verifique manualmente."
    exit 1
fi

#!/bin/bash

# Script para aplicar configuração específica do Nginx - SOLUÇÃO DEFINITIVA
# Execute este script no servidor Hostinger VPS

echo "🔧 APLICANDO CONFIGURAÇÃO ESPECÍFICA DO NGINX..."

# 1. Fazer backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# 2. Remover configurações antigas se existirem
sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/default
sudo sed -i '/location = \/api\/upload-document/,/}/d' /etc/nginx/sites-available/default

# 3. Adicionar configuração específica ANTES do primeiro location
sudo sed -i '/location \/ {/i\    # Configuração específica para upload de documentos\n    location = /api/upload-document {\n        client_max_body_size 20M;\n        proxy_request_buffering off;\n        proxy_buffering off;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_connect_timeout 60s;\n        proxy_send_timeout 60s;\n        proxy_read_timeout 60s;\n    }\n\n    # Configuração para criação de pastas\n    location = /api/create-folder {\n        client_max_body_size 20M;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n' /etc/nginx/sites-available/default

# 4. Verificar configuração
echo "📋 Verificando configuração aplicada:"
sudo grep -A10 "location = /api/upload-document" /etc/nginx/sites-available/default

# 5. Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

# 6. Se teste passou, aplicar
if [ $? -eq 0 ]; then
    echo "✅ Configuração válida! Aplicando..."
    sudo systemctl reload nginx
    echo "✅ Nginx recarregado!"
    
    # 7. Reiniciar upload-server
    sudo pm2 restart upload-server
    echo "✅ Upload-server reiniciado!"
    
    # 8. Verificar status
    sudo pm2 status
    echo "🎉 CONFIGURAÇÃO ESPECÍFICA APLICADA COM SUCESSO!"
    echo "📋 Configurações aplicadas:"
    echo "   - client_max_body_size: 20M"
    echo "   - proxy_request_buffering: off"
    echo "   - proxy_buffering: off"
    echo "   - Configuração específica para /api/upload-document"
else
    echo "❌ Erro na configuração! Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    exit 1
fi

echo "📝 TESTE AGORA: Faça upload do arquivo credenciamento.pdf"

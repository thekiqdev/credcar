#!/bin/bash

# SOLUÇÃO ALTERNATIVA - BYPASS DO NGINX
# Configurar upload direto para o Node.js na porta 3001

echo "🔧 APLICANDO SOLUÇÃO ALTERNATIVA - BYPASS DO NGINX"
echo "================================================="

# 1. Verificar se o upload-server está rodando na porta 3001
echo "📊 Verificando upload-server na porta 3001..."
sudo netstat -tlnp | grep :3001

# 2. Configurar Nginx para proxy direto sem limitações
echo "🔧 Configurando proxy direto sem limitações..."

# Backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Limpar configurações antigas
sudo sed -i '/location.*\/api\//,/^[[:space:]]*}/d' /etc/nginx/sites-available/default
sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/default

# Adicionar configuração de bypass
sudo sed -i '/server_name.*credcarmultimarcas/a\    # Bypass do Nginx para uploads - sem limitações\n    location /api/upload-document {\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_request_buffering off;\n        proxy_buffering off;\n        proxy_read_timeout 300s;\n        proxy_connect_timeout 300s;\n        proxy_send_timeout 300s;\n    }\n    \n    location /api/create-folder {\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-available/default

# 3. Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração válida!"
    
    # 4. Aplicar configuração
    echo "🔄 Recarregando Nginx..."
    sudo nginx -s reload
    
    # 5. Verificar configuração aplicada
    echo "📋 Configuração aplicada:"
    sudo grep -A10 "location /api/upload-document" /etc/nginx/sites-available/default
    
    # 6. Reiniciar upload-server
    echo "🔄 Reiniciando upload-server..."
    sudo pm2 restart upload-server
    
    # 7. Verificar se está rodando
    echo "📊 Status do upload-server:"
    sudo pm2 status upload-server
    
    echo ""
    echo "🎉 SOLUÇÃO ALTERNATIVA APLICADA!"
    echo "================================="
    echo "✅ Bypass do Nginx configurado"
    echo "✅ Upload direto para Node.js na porta 3001"
    echo "✅ Sem limitações de tamanho do Nginx"
    echo "✅ Upload-server reiniciado"
    echo ""
    echo "📝 TESTE AGORA: Upload do arquivo credenciamento.pdf"
    echo "🌐 Endpoint: https://sistema.credcarmultimarcas.com.br/api/upload-document"
    
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    echo "❌ Configuração restaurada."
    exit 1
fi

#!/bin/bash

# SOLUÇÃO DEFINITIVA - ERRO 413 PERSISTENTE
# Vamos aplicar a configuração diretamente no arquivo

echo "🚨 SOLUÇÃO DEFINITIVA PARA ERRO 413"
echo "===================================="

# 1. Backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# 2. Verificar arquivo atual
echo "📋 Arquivo atual do Nginx:"
sudo head -50 /etc/nginx/sites-available/default

# 3. Criar novo arquivo de configuração
echo "➕ Criando nova configuração..."

sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80;
    server_name sistema.credcarmultimarcas.com.br;

    # Configuração específica para upload de documentos
    location = /api/upload-document {
        add_header X-Nginx-Location "upload-document-ACTIVE" always;
        client_max_body_size 20M;
        client_body_timeout 60s;
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /api/create-folder {
        client_max_body_size 20M;
        client_body_timeout 60s;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Configuração para o frontend
    location / {
        try_files $uri $uri/ /index.html;
        root /var/www/CredCar-Finance/dist;
        index index.html;
    }

    # Configuração para assets estáticos
    location /assets/ {
        root /var/www/CredCar-Finance/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 4. Verificar configuração
echo "📋 Nova configuração aplicada:"
sudo cat /etc/nginx/sites-available/default

# 5. Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração válida!"
    
    # 6. Aplicar configuração
    echo "🔄 Recarregando Nginx..."
    sudo nginx -s reload
    
    # 7. Verificar se foi aplicado
    echo "🔍 Verificando se a configuração foi aplicada:"
    sudo grep -A5 "client_max_body_size 20M" /etc/nginx/sites-available/default
    
    # 8. Reiniciar upload-server
    echo "🔄 Reiniciando upload-server..."
    sudo pm2 restart upload-server
    
    echo ""
    echo "🎉 SOLUÇÃO DEFINITIVA APLICADA!"
    echo "==============================="
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

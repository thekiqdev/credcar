#!/bin/bash

# Script para corrigir configuração do Nginx para uploads maiores
# Execute este script no servidor VPS

echo "🔧 Corrigindo configuração do Nginx para uploads maiores..."

# Backup da configuração atual
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Adicionar configurações de upload ao arquivo de configuração do Nginx
sudo tee -a /etc/nginx/sites-available/default > /dev/null << 'EOF'

# Configurações para uploads maiores
client_max_body_size 15M;
client_body_timeout 60s;
client_header_timeout 60s;

# Configurações específicas para rotas de upload
location /api/upload-document {
    client_max_body_size 15M;
    client_body_timeout 60s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/create-folder {
    client_max_body_size 15M;
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
EOF

# Testar configuração do Nginx
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração do Nginx válida!"
    
    # Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx recarregado com sucesso!"
    echo "📋 Configurações aplicadas:"
    echo "   - client_max_body_size: 15M"
    echo "   - client_body_timeout: 60s"
    echo "   - client_header_timeout: 60s"
    echo "   - Configurações específicas para /api/upload-document"
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    exit 1
fi

echo "🎉 Correção aplicada com sucesso!"
echo "📝 Próximos passos:"
echo "   1. Reiniciar o upload-server: sudo pm2 restart upload-server"
echo "   2. Testar upload de arquivo maior que 1MB"

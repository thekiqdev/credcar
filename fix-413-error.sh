#!/bin/bash

# Script para corrigir erro 413 Request Entity Too Large
# Execute este script na Hostinger VPS

echo "🔧 Corrigindo erro 413 Request Entity Too Large..."

# 1. Parar o upload-server
echo "📤 Parando upload-server..."
sudo pm2 stop upload-server

# 2. Atualizar código
echo "📥 Atualizando código..."
cd /var/www/CredCar-Finance
git pull origin deploy-v1.5

# 3. Verificar configuração do Nginx
echo "🔍 Verificando configuração do Nginx..."
nginx_config="/etc/nginx/sites-available/credcar"
if [ -f "$nginx_config" ]; then
    echo "📋 Configuração atual do Nginx:"
    grep -n "client_max_body_size\|proxy_read_timeout\|location.*api" "$nginx_config" || echo "Configurações não encontradas"
else
    echo "❌ Arquivo de configuração do Nginx não encontrado: $nginx_config"
fi

# 4. Aplicar correções no Nginx
echo "🔧 Aplicando correções no Nginx..."
sudo tee -a "$nginx_config" > /dev/null << 'EOF'

# Configurações para upload de arquivos grandes
client_max_body_size 50M;
client_body_timeout 60s;
client_header_timeout 60s;

# Configurações específicas para upload
location /api/upload-document {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Configurações específicas para upload
    proxy_request_buffering off;
    proxy_buffering off;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
}
EOF

# 5. Testar configuração do Nginx
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração do Nginx válida!"
    
    # 6. Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    
    # 7. Reiniciar upload-server
    echo "🚀 Reiniciando upload-server..."
    sudo pm2 start upload-server.js --name "upload-server"
    
    # 8. Verificar status
    echo "📊 Status dos serviços:"
    sudo pm2 status
    sudo systemctl status nginx --no-pager -l
    
    echo "✅ Correção aplicada com sucesso!"
    echo "🧪 Teste o upload novamente no frontend"
    
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔍 Verifique o arquivo de configuração manualmente"
fi

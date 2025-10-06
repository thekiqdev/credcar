#!/bin/bash

# Script para limpar e reconstruir configuração Nginx
echo "🧹 Limpando configuração Nginx..."

# 1. Fazer backup
echo "📋 Fazendo backup..."
sudo cp /etc/nginx/sites-available/credcar /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S)

# 2. Mostrar estrutura atual
echo "📊 Estrutura atual (primeiras 20 linhas):"
head -20 /etc/nginx/sites-available/credcar

echo ""
echo "📊 Estrutura atual (últimas 20 linhas):"
tail -20 /etc/nginx/sites-available/credcar

# 3. Criar nova configuração limpa
echo "🔨 Criando nova configuração limpa..."

# Extrair apenas as configurações essenciais (sem duplicatas)
sudo cat > /tmp/nginx_clean.conf << 'EOF'
server {
    listen 443 ssl;
    server_name sistema.credcarmultimarcas.com.br;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/sistema.credcarmultimarcas.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sistema.credcarmultimarcas.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Root directory
    root /var/www/CredCar-Finance/dist;
    index index.html;

    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Assets location
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy para upload server
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Documentos location
    location /documentos/ {
        alias /var/www/CredCar-Finance/documentos/;
        expires 1y;
        add_header Cache-Control "public";
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name sistema.credcarmultimarcas.com.br;
    return 301 https://$server_name$request_uri;
}
EOF

# 4. Substituir arquivo
echo "🔄 Substituindo arquivo de configuração..."
sudo cp /tmp/nginx_clean.conf /etc/nginx/sites-available/credcar

# 5. Testar configuração
echo "🧪 Testando nova configuração..."
if sudo nginx -t; then
    echo "✅ Configuração válida!"
    
    # 6. Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx recarregado com sucesso!"
    
    # 7. Verificar status
    echo "📊 Status do Nginx:"
    sudo systemctl status nginx --no-pager -l
    
else
    echo "❌ Configuração inválida!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/credcar
    exit 1
fi

echo "🎯 Configuração limpa e funcional!"
echo "🧪 Testando endpoints..."
echo "Health check:"
curl -s http://localhost:3001/api/health | head -1
echo "Frontend:"
curl -s -I https://sistema.credcarmultimarcas.com.br | head -1

#!/bin/bash

# Script para atualizar CredCar na VPS
# Execute: bash update-vps.sh

echo "🚀 Atualizando CredCar na VPS..."

# 1. Ir para diretório do projeto
cd /var/www/CredCar-Finance

# 2. Fazer backup da configuração atual do Nginx
echo "📋 Fazendo backup da configuração Nginx..."
sudo cp /etc/nginx/sites-available/credcar /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S)

# 3. Atualizar código
echo "📥 Atualizando código do GitHub..."
git pull origin deploy-v1.2

# 4. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 5. Fazer build
echo "🔨 Fazendo build da aplicação..."
npm run build

# 6. Verificar se build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build falhou - diretório dist não encontrado"
    exit 1
fi

# 7. Configurar Nginx (adicionar proxy se não existir)
echo "⚙️ Configurando Nginx..."
if ! grep -q "location /api/" /etc/nginx/sites-available/credcar; then
    echo "📝 Adicionando configuração de proxy para upload server..."
    
    # Adicionar configuração de proxy antes do último }
    sudo sed -i '/^[[:space:]]*}[[:space:]]*$/i\
    # Proxy para upload server\
    location /api/ {\
        proxy_pass http://localhost:3001/api/;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection '\''upgrade'\'';\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_cache_bypass $http_upgrade;\
        proxy_read_timeout 300s;\
        proxy_connect_timeout 75s;\
    }' /etc/nginx/sites-available/credcar
fi

# 8. Testar configuração do Nginx
echo "🧪 Testando configuração Nginx..."
if ! sudo nginx -t; then
    echo "❌ Erro: Configuração Nginx inválida"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/credcar
    exit 1
fi

# 9. Reiniciar serviços
echo "🔄 Reiniciando serviços..."

# Reiniciar upload server
pm2 restart credcar-upload-server

# Recarregar Nginx
sudo systemctl reload nginx

# 10. Verificar status
echo "📊 Verificando status dos serviços..."
echo "PM2 Status:"
pm2 status

echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l

# 11. Testar endpoints
echo "🧪 Testando endpoints..."
echo "Health Check:"
curl -s http://localhost:3001/api/health | head -1

echo "Frontend:"
curl -s -I https://sistema.credcarmultimarcas.com.br | head -1

echo "✅ Atualização concluída!"
echo "🌐 Acesse: https://sistema.credcarmultimarcas.com.br"
echo "📊 PM2 Dashboard: pm2 monit"
echo "📋 Logs Upload: pm2 logs credcar-upload-server"

#!/bin/bash

# Script para corrigir configuração Nginx
# Execute: bash fix-nginx-config.sh

echo "🔧 Corrigindo configuração Nginx..."

# 1. Fazer backup
echo "📋 Fazendo backup..."
sudo cp /etc/nginx/sites-available/credcar /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S)

# 2. Verificar estrutura atual
echo "📊 Verificando estrutura atual do arquivo..."
echo "Últimas 10 linhas do arquivo:"
tail -10 /etc/nginx/sites-available/credcar

# 3. Criar configuração temporária
echo "📝 Criando configuração temporária..."
cat > /tmp/nginx_proxy_config.txt << 'EOF'
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
EOF

# 4. Inserir configuração antes do último }
echo "⚙️ Inserindo configuração de proxy..."
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

# 5. Verificar se inserção foi bem-sucedida
if grep -q "location /api/" /etc/nginx/sites-available/credcar; then
    echo "✅ Configuração inserida com sucesso!"
else
    echo "❌ Falha ao inserir configuração"
    exit 1
fi

# 6. Testar configuração
echo "🧪 Testando configuração Nginx..."
if sudo nginx -t; then
    echo "✅ Configuração Nginx válida!"
    
    # 7. Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx recarregado com sucesso!"
else
    echo "❌ Configuração Nginx inválida!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/credcar
    exit 1
fi

echo "🎯 Configuração concluída!"
echo "📊 Verificando status..."
sudo systemctl status nginx --no-pager -l

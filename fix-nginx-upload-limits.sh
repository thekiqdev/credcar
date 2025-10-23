#!/bin/bash

# Script para corrigir limites de upload no Nginx
echo "🔧 CORRIGINDO LIMITES DE UPLOAD NO NGINX"
echo "========================================"

# 1. Fazer backup
echo "📋 Fazendo backup..."
sudo cp /etc/nginx/sites-available/credcar /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S)

# 2. Verificar configuração atual
echo "📊 Verificando configuração atual..."
echo "Últimas 20 linhas do arquivo:"
tail -20 /etc/nginx/sites-available/credcar

echo ""
echo "📊 Procurando por client_max_body_size..."
grep -n "client_max_body_size" /etc/nginx/sites-available/credcar || echo "❌ client_max_body_size não encontrado"

# 3. Criar configuração temporária com limites de upload
echo "📝 Criando configuração com limites de upload..."
cat > /tmp/nginx_upload_config.txt << 'EOF'
    # Limites de upload
    client_max_body_size 50M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
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
        proxy_send_timeout 300s;
        
        # Limites específicos para upload
        client_max_body_size 50M;
        client_body_timeout 60s;
    }
EOF

# 4. Verificar se já existe configuração de proxy
if grep -q "location /api/" /etc/nginx/sites-available/credcar; then
    echo "⚠️  Configuração de proxy já existe. Removendo duplicatas..."
    
    # Remover configurações existentes de proxy
    sudo sed -i '/location \/api\/ {/,/}/d' /etc/nginx/sites-available/credcar
    sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/credcar
    sudo sed -i '/client_body_timeout/d' /etc/nginx/sites-available/credcar
    sudo sed -i '/client_header_timeout/d' /etc/nginx/sites-available/credcar
fi

# 5. Inserir nova configuração antes do último }
echo "⚙️ Inserindo nova configuração..."
sudo sed -i '/^[[:space:]]*}[[:space:]]*$/i\
    # Limites de upload\
    client_max_body_size 50M;\
    client_body_timeout 60s;\
    client_header_timeout 60s;\
    \
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
        proxy_send_timeout 300s;\
        \
        # Limites específicos para upload\
        client_max_body_size 50M;\
        client_body_timeout 60s;\
    }' /etc/nginx/sites-available/credcar

# 6. Verificar se inserção foi bem-sucedida
if grep -q "client_max_body_size 50M" /etc/nginx/sites-available/credcar; then
    echo "✅ Configuração inserida com sucesso!"
else
    echo "❌ Falha ao inserir configuração"
    exit 1
fi

# 7. Testar configuração
echo "🧪 Testando configuração..."
if sudo nginx -t; then
    echo "✅ Configuração válida!"
    
    # 8. Recarregar nginx
    echo "🔄 Recarregando nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx recarregado com sucesso!"
    
    # 9. Mostrar configuração final
    echo "📋 Configuração final (últimas 30 linhas):"
    tail -30 /etc/nginx/sites-available/credcar
    
else
    echo "❌ Configuração inválida!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/credcar
    exit 1
fi

echo ""
echo "🎯 LIMITES CONFIGURADOS:"
echo "- Tamanho máximo de arquivo: 50MB"
echo "- Timeout de upload: 60s"
echo "- Timeout de header: 60s"
echo "- Timeout de proxy: 300s"
echo ""
echo "✅ CORREÇÃO CONCLUÍDA!"
echo "Agora você pode fazer upload de arquivos até 50MB"

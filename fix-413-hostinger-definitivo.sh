#!/bin/bash

# SOLUÇÃO DEFINITIVA PARA ERRO 413 NO HOSTINGER
# O problema é que o Nginx está rejeitando arquivos > 1MB antes de chegar ao Node.js

echo "🔧 CORRIGINDO ERRO 413 - Request Entity Too Large"
echo "📁 Arquivo: credenciamento.pdf (1.18MB)"
echo "🌐 Domínio: sistema.credcarmultimarcas.com.br"

# 1. Backup da configuração atual
echo "💾 Fazendo backup da configuração atual..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# 2. Verificar configuração atual
echo "📋 Configuração atual do Nginx:"
sudo grep -n "client_max_body_size\|server_name.*credcarmultimarcas" /etc/nginx/sites-available/default

# 3. Remover configurações antigas se existirem
echo "🧹 Removendo configurações antigas..."
sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/default

# 4. Adicionar configuração específica para o domínio
echo "➕ Adicionando configuração para uploads maiores..."

# Encontrar a linha do server_name e adicionar configuração após
sudo sed -i '/server_name.*credcarmultimarcas/a\    client_max_body_size 15M;\n    client_body_timeout 60s;\n    client_header_timeout 60s;\n    proxy_read_timeout 60s;\n    proxy_connect_timeout 60s;\n    proxy_send_timeout 60s;' /etc/nginx/sites-available/default

# 5. Adicionar configuração específica para a rota de upload
echo "🎯 Configurando rota específica /api/upload-document..."

# Verificar se já existe location para /api/
if grep -q "location /api/" /etc/nginx/sites-available/default; then
    echo "⚠️  Rota /api/ já existe, atualizando..."
    sudo sed -i '/location \/api\//c\    location /api/upload-document {\n        client_max_body_size 15M;\n        client_body_timeout 60s;\n        proxy_connect_timeout 60s;\n        proxy_send_timeout 60s;\n        proxy_read_timeout 60s;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n    \n    location /api/create-folder {\n        client_max_body_size 15M;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-available/default
else
    echo "➕ Adicionando rota /api/..."
    sudo sed -i '/location \/ {/i\    location /api/upload-document {\n        client_max_body_size 15M;\n        client_body_timeout 60s;\n        proxy_connect_timeout 60s;\n        proxy_send_timeout 60s;\n        proxy_read_timeout 60s;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n    \n    location /api/create-folder {\n        client_max_body_size 15M;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n' /etc/nginx/sites-available/default
fi

# 6. Verificar configuração final
echo "📋 Configuração final aplicada:"
sudo grep -A10 -B5 "client_max_body_size\|location /api" /etc/nginx/sites-available/default

# 7. Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração válida!"
    
    # 8. Aplicar configuração
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    
    # 9. Reiniciar upload-server
    echo "🔄 Reiniciando upload-server..."
    sudo pm2 restart upload-server
    
    # 10. Verificar status
    echo "📊 Status dos serviços:"
    sudo pm2 status
    
    echo ""
    echo "🎉 CORREÇÃO APLICADA COM SUCESSO!"
    echo "📝 Teste agora o upload do arquivo credenciamento.pdf"
    echo "📁 Arquivo: 1.18MB deve ser aceito"
    echo "🌐 Endpoint: https://sistema.credcarmultimarcas.com.br/api/upload-document"
    
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    echo "❌ Configuração restaurada. Verifique manualmente."
    exit 1
fi

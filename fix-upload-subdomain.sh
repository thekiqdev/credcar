#!/bin/bash

# SOLUÇÃO DEFINITIVA - CRIAR SUBDOMÍNIO PARA UPLOAD
# Criar upload.credcarmultimarcas.com.br apontando diretamente para porta 3001

echo "🔧 APLICANDO SOLUÇÃO DEFINITIVA - SUBDOMÍNIO PARA UPLOAD"
echo "======================================================="

# 1. Criar configuração para subdomínio de upload
echo "📝 Criando configuração para subdomínio upload..."

# Backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Adicionar configuração para subdomínio de upload
sudo tee -a /etc/nginx/sites-available/default > /dev/null << 'EOF'

# Configuração para subdomínio de upload - sem limitações
server {
    listen 80;
    server_name upload.credcarmultimarcas.com.br;
    
    # Sem limitações de tamanho
    client_max_body_size 0;
    client_body_timeout 300s;
    client_header_timeout 300s;
    
    # Proxy direto para Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

# 2. Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração válida!"
    
    # 3. Aplicar configuração
    echo "🔄 Recarregando Nginx..."
    sudo nginx -s reload
    
    # 4. Verificar configuração aplicada
    echo "📋 Configuração aplicada:"
    sudo grep -A20 "server_name upload.credcarmultimarcas.com.br" /etc/nginx/sites-available/default
    
    echo ""
    echo "🎉 SOLUÇÃO DEFINITIVA APLICADA!"
    echo "==============================="
    echo "✅ Subdomínio upload.credcarmultimarcas.com.br configurado"
    echo "✅ Sem limitações de tamanho (client_max_body_size 0)"
    echo "✅ Proxy direto para Node.js na porta 3001"
    echo ""
    echo "📝 PRÓXIMAS ETAPAS:"
    echo "   1. Configurar DNS para upload.credcarmultimarcas.com.br"
    echo "   2. Modificar frontend para usar upload.credcarmultimarcas.com.br"
    echo "   3. Testar upload sem limitações"
    echo ""
    echo "🌐 URL para teste:"
    echo "   - http://upload.credcarmultimarcas.com.br/health"
    echo "   - http://upload.credcarmultimarcas.com.br/api/upload-document"
    
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    echo "❌ Configuração restaurada."
    exit 1
fi

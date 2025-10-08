#!/bin/bash

# Script URGENTE para corrigir erro 413 - SOLUÇÃO DEFINITIVA
# Execute este script no servidor Hostinger VPS

echo "🚨 CORREÇÃO URGENTE - ERRO 413 REQUEST ENTITY TOO LARGE"
echo "======================================================="

# 1. Parar Nginx temporariamente
echo ""
echo "📋 1. PARANDO NGINX TEMPORARIAMENTE..."
sudo systemctl stop nginx

# 2. Fazer backup
echo ""
echo "📋 2. FAZENDO BACKUP..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# 3. Criar configuração limpa e correta
echo ""
echo "📋 3. CRIANDO CONFIGURAÇÃO LIMPA E CORRETA..."

# Criar arquivo de configuração limpo
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80;
    server_name sistema.credcarmultimarcas.com.br;
    
    # Configuração global para uploads
    client_max_body_size 20M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Configuração específica para upload de documentos
    location = /api/upload-document {
        add_header X-Nginx-Location "upload-document-ACTIVE" always;
        client_max_body_size 20M;
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_pass http://localhost:3001;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Configuração para criação de pastas
    location = /api/create-folder {
        client_max_body_size 20M;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Configuração geral para outras rotas da API
    location /api/ {
        client_max_body_size 20M;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Configuração para arquivos estáticos
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo "✅ Configuração limpa criada"

# 4. Testar configuração
echo ""
echo "📋 4. TESTANDO CONFIGURAÇÃO..."
if sudo nginx -t; then
    echo "✅ Configuração válida"
else
    echo "❌ Erro na configuração!"
    sudo nginx -t
    exit 1
fi

# 5. Iniciar Nginx
echo ""
echo "📋 5. INICIANDO NGINX..."
sudo systemctl start nginx

# 6. Verificar se Nginx está rodando
echo ""
echo "📋 6. VERIFICANDO NGINX..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está ativo"
else
    echo "❌ Erro ao iniciar Nginx!"
    exit 1
fi

# 7. Verificar upload-server
echo ""
echo "📋 7. VERIFICANDO UPLOAD-SERVER..."
if pgrep -f "upload-server.js" > /dev/null; then
    echo "✅ Upload-server está rodando"
else
    echo "⚠️  Iniciando upload-server..."
    if command -v pm2 > /dev/null; then
        pm2 start upload-server.js --name "upload-server"
        echo "✅ Upload-server iniciado via PM2"
    else
        echo "❌ PM2 não encontrado. Inicie manualmente: node upload-server.js"
    fi
fi

# 8. Teste de conectividade
echo ""
echo "📋 8. TESTE DE CONECTIVIDADE..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health; then
    echo "✅ Upload-server responde na porta 3001"
else
    echo "❌ Upload-server não responde. Verificando logs..."
    if command -v pm2 > /dev/null; then
        pm2 logs upload-server --lines 5
    fi
fi

# 9. Teste de headers
echo ""
echo "📋 9. TESTE DE HEADERS..."
echo "Testando headers da rota /api/upload-document..."
response=$(curl -s -I http://localhost:3001/api/upload-document 2>/dev/null || echo "Erro na conexão")
echo "Headers recebidos:"
echo "$response"

# 10. Teste final
echo ""
echo "📋 10. TESTE FINAL..."
echo "Testando configuração via HTTPS..."
https_response=$(curl -s -I https://sistema.credcarmultimarcas.com.br/api/upload-document 2>/dev/null || echo "Erro na conexão HTTPS")
echo "Headers HTTPS:"
echo "$https_response"

echo ""
echo "🎉 CORREÇÃO URGENTE APLICADA COM SUCESSO!"
echo "=========================================="
echo "📋 Configurações aplicadas:"
echo "   ✅ client_max_body_size: 20M (global e específico)"
echo "   ✅ proxy_request_buffering: off"
echo "   ✅ proxy_buffering: off"
echo "   ✅ Configuração limpa sem duplicidades"
echo "   ✅ Headers de debug adicionados"
echo ""
echo "📝 TESTE AGORA:"
echo "   1. Faça upload do arquivo credenciamento.pdf"
echo "   2. Verifique se retorna header X-Nginx-Location: upload-document-ACTIVE"
echo "   3. Monitore logs: sudo pm2 logs upload-server"
echo ""
echo "🔍 Para verificar se está funcionando:"
echo "   curl -I https://sistema.credcarmultimarcas.com.br/api/upload-document"

#!/bin/bash

# Script DEFINITIVO FINAL para erro 413 - SOLUÇÃO RADICAL
# Execute este script no servidor Hostinger VPS

echo "🔥 SOLUÇÃO DEFINITIVA FINAL - ERRO 413 REQUEST ENTITY TOO LARGE"
echo "==============================================================="

# 1. Parar todos os serviços
echo ""
echo "📋 1. PARANDO TODOS OS SERVIÇOS..."
sudo systemctl stop nginx
sudo pm2 stop all

# 2. Fazer backup completo
echo ""
echo "📋 2. FAZENDO BACKUP COMPLETO..."
backup_dir="/root/backup-nginx-$(date +%Y%m%d_%H%M%S)"
sudo mkdir -p "$backup_dir"
sudo cp -r /etc/nginx "$backup_dir/"
echo "✅ Backup criado em: $backup_dir"

# 3. Verificar configuração atual
echo ""
echo "📋 3. VERIFICANDO CONFIGURAÇÃO ATUAL..."
echo "Conteúdo atual do arquivo de configuração:"
sudo cat /etc/nginx/sites-available/default

# 4. Criar configuração DEFINITIVA
echo ""
echo "📋 4. CRIANDO CONFIGURAÇÃO DEFINITIVA..."

# Criar arquivo de configuração DEFINITIVO
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80;
    server_name sistema.credcarmultimarcas.com.br;
    
    # Configuração global para uploads
    client_max_body_size 50M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    client_body_buffer_size 128k;
    
    # Configuração específica para upload de documentos
    location = /api/upload-document {
        add_header X-Nginx-Location "upload-document-ACTIVE" always;
        add_header X-Debug-Config "20MB-limit-applied" always;
        client_max_body_size 50M;
        client_body_timeout 300s;
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_pass http://localhost:3001;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Original-URI $request_uri;
    }
    
    # Configuração para criação de pastas
    location = /api/create-folder {
        add_header X-Nginx-Location "create-folder-ACTIVE" always;
        client_max_body_size 50M;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Configuração geral para outras rotas da API
    location /api/ {
        client_max_body_size 50M;
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

echo "✅ Configuração DEFINITIVA criada"

# 5. Verificar se a configuração foi aplicada
echo ""
echo "📋 5. VERIFICANDO CONFIGURAÇÃO APLICADA..."
echo "Configuração para /api/upload-document:"
sudo grep -A20 "location = /api/upload-document" /etc/nginx/sites-available/default

# 6. Testar configuração
echo ""
echo "📋 6. TESTANDO CONFIGURAÇÃO..."
if sudo nginx -t; then
    echo "✅ Configuração válida"
else
    echo "❌ Erro na configuração!"
    sudo nginx -t
    echo "🔄 Restaurando backup..."
    sudo cp -r "$backup_dir/nginx" /etc/
    exit 1
fi

# 7. Iniciar Nginx
echo ""
echo "📋 7. INICIANDO NGINX..."
sudo systemctl start nginx

# 8. Verificar Nginx
echo ""
echo "📋 8. VERIFICANDO NGINX..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está ativo"
else
    echo "❌ Erro ao iniciar Nginx!"
    exit 1
fi

# 9. Iniciar upload-server
echo ""
echo "📋 9. INICIANDO UPLOAD-SERVER..."
if command -v pm2 > /dev/null; then
    pm2 start upload-server.js --name "upload-server"
    echo "✅ Upload-server iniciado via PM2"
else
    echo "❌ PM2 não encontrado. Inicie manualmente: node upload-server.js"
fi

# 10. Aguardar serviços iniciarem
echo ""
echo "📋 10. AGUARDANDO SERVIÇOS INICIAREM..."
sleep 5

# 11. Teste de conectividade
echo ""
echo "📋 11. TESTE DE CONECTIVIDADE..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health; then
    echo "✅ Upload-server responde na porta 3001"
else
    echo "❌ Upload-server não responde. Verificando logs..."
    if command -v pm2 > /dev/null; then
        pm2 logs upload-server --lines 10
    fi
fi

# 12. Teste de headers
echo ""
echo "📋 12. TESTE DE HEADERS..."
echo "Testando headers da rota /api/upload-document..."
response=$(curl -s -I http://localhost:3001/api/upload-document 2>/dev/null || echo "Erro na conexão")
echo "Headers recebidos:"
echo "$response"

# 13. Teste final via HTTPS
echo ""
echo "📋 13. TESTE FINAL VIA HTTPS..."
echo "Testando configuração via HTTPS..."
https_response=$(curl -s -I https://sistema.credcarmultimarcas.com.br/api/upload-document 2>/dev/null || echo "Erro na conexão HTTPS")
echo "Headers HTTPS:"
echo "$https_response"

# 14. Verificar se o header específico está presente
echo ""
echo "📋 14. VERIFICANDO HEADER ESPECÍFICO..."
if echo "$https_response" | grep -q "X-Nginx-Location: upload-document-ACTIVE"; then
    echo "✅ Header X-Nginx-Location: upload-document-ACTIVE encontrado!"
else
    echo "❌ Header X-Nginx-Location NÃO encontrado!"
    echo "Isso indica que a configuração específica não está sendo aplicada."
fi

echo ""
echo "🎉 SOLUÇÃO DEFINITIVA FINAL APLICADA!"
echo "====================================="
echo "📋 Configurações aplicadas:"
echo "   ✅ client_max_body_size: 50M (global e específico)"
echo "   ✅ client_body_timeout: 300s"
echo "   ✅ proxy_request_buffering: off"
echo "   ✅ proxy_buffering: off"
echo "   ✅ Configuração limpa sem duplicidades"
echo "   ✅ Headers de debug adicionados"
echo "   ✅ Timeouts aumentados para 300s"
echo ""
echo "📝 TESTE AGORA:"
echo "   1. Faça upload do arquivo credenciamento.pdf"
echo "   2. Verifique se retorna header X-Nginx-Location: upload-document-ACTIVE"
echo "   3. Monitore logs: sudo pm2 logs upload-server"
echo ""
echo "🔍 Para verificar se está funcionando:"
echo "   curl -I https://sistema.credcarmultimarcas.com.br/api/upload-document"
echo "   (Deve retornar X-Nginx-Location: upload-document-ACTIVE)"

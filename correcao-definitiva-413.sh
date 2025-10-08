#!/bin/bash

# Script de correção definitiva para erro 413 Request Entity Too Large
# Execute este script no servidor Hostinger VPS

echo "🔧 CORREÇÃO DEFINITIVA - ERRO 413 REQUEST ENTITY TOO LARGE"
echo "============================================================"

# 1. Fazer backup da configuração atual
echo ""
echo "📋 1. FAZENDO BACKUP DA CONFIGURAÇÃO ATUAL..."
backup_file="/etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp /etc/nginx/sites-available/default "$backup_file"
echo "✅ Backup criado: $backup_file"

# 2. Remover configurações antigas e duplicadas
echo ""
echo "📋 2. REMOVENDO CONFIGURAÇÕES ANTIGAS E DUPLICADAS..."

# Remover todas as configurações de client_max_body_size existentes
sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/default

# Remover configurações antigas de upload-document
sudo sed -i '/location.*upload-document/,/}/d' /etc/nginx/sites-available/default

# Remover configurações antigas de create-folder
sudo sed -i '/location.*create-folder/,/}/d' /etc/nginx/sites-available/default

echo "✅ Configurações antigas removidas"

# 3. Adicionar configuração específica e correta
echo ""
echo "📋 3. ADICIONANDO CONFIGURAÇÃO ESPECÍFICA E CORRETA..."

# Adicionar configuração ANTES do primeiro location
sudo sed -i '/location \/ {/i\    # Configuração específica para upload de documentos\n    location = /api/upload-document {\n        add_header X-Nginx-Location "upload-document-ACTIVE" always;\n        client_max_body_size 20M;\n        proxy_request_buffering off;\n        proxy_buffering off;\n        proxy_pass http://localhost:3001;\n        proxy_connect_timeout 60s;\n        proxy_send_timeout 60s;\n        proxy_read_timeout 60s;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n\n    # Configuração para criação de pastas\n    location = /api/create-folder {\n        client_max_body_size 20M;\n        proxy_pass http://localhost:3001;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n' /etc/nginx/sites-available/default

echo "✅ Configuração específica adicionada"

# 4. Verificar configuração aplicada
echo ""
echo "📋 4. VERIFICANDO CONFIGURAÇÃO APLICADA..."
echo "Configuração para /api/upload-document:"
sudo grep -A15 "location = /api/upload-document" /etc/nginx/sites-available/default

# 5. Testar configuração do Nginx
echo ""
echo "📋 5. TESTANDO CONFIGURAÇÃO DO NGINX..."
if sudo nginx -t; then
    echo "✅ Configuração do Nginx é válida"
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔄 Restaurando backup..."
    sudo cp "$backup_file" /etc/nginx/sites-available/default
    exit 1
fi

# 6. Recarregar Nginx
echo ""
echo "📋 6. RECARREGANDO NGINX..."
if sudo systemctl reload nginx; then
    echo "✅ Nginx recarregado com sucesso"
else
    echo "❌ Erro ao recarregar Nginx!"
    exit 1
fi

# 7. Verificar se upload-server está rodando
echo ""
echo "📋 7. VERIFICANDO UPLOAD-SERVER..."
if pgrep -f "upload-server.js" > /dev/null; then
    echo "✅ Upload-server está rodando"
else
    echo "⚠️  Upload-server não está rodando. Iniciando..."
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
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health; then
    echo "✅ Upload-server responde na porta 3001"
else
    echo "❌ Upload-server não responde. Verifique os logs:"
    if command -v pm2 > /dev/null; then
        pm2 logs upload-server --lines 5
    fi
fi

# 9. Verificar headers da resposta
echo ""
echo "📋 9. TESTE DE HEADERS..."
echo "Testando headers da rota /api/upload-document..."
response=$(curl -s -I http://localhost:3001/api/upload-document 2>/dev/null || echo "Erro na conexão")
echo "Headers recebidos:"
echo "$response"

echo ""
echo "🎉 CORREÇÃO APLICADA COM SUCESSO!"
echo "=================================="
echo "📋 Configurações aplicadas:"
echo "   ✅ client_max_body_size: 20M"
echo "   ✅ proxy_request_buffering: off"
echo "   ✅ proxy_buffering: off"
echo "   ✅ Configuração específica para /api/upload-document"
echo "   ✅ Headers de debug adicionados"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "   1. Teste o upload do arquivo credenciamento.pdf"
echo "   2. Verifique os logs: sudo pm2 logs upload-server"
echo "   3. Monitore os logs do Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🔍 Para verificar se a configuração está ativa:"
echo "   curl -I https://sistema.credcarmultimarcas.com.br/api/upload-document"
echo "   (Deve retornar header X-Nginx-Location: upload-document-ACTIVE)"

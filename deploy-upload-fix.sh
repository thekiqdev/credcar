#!/bin/bash

# Script completo para corrigir problemas de upload na VPS
echo "🚀 CORREÇÃO COMPLETA DE UPLOAD - VPS"
echo "===================================="

# 1. Verificar status atual
echo "📊 Verificando status atual..."
pm2 status
echo ""

# 2. Parar serviços temporariamente
echo "⏸️ Parando serviços..."
pm2 stop all

# 3. Fazer backup da configuração nginx
echo "📋 Fazendo backup do nginx..."
sudo cp /etc/nginx/sites-available/credcar /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S)

# 4. Aplicar correção do nginx
echo "🔧 Aplicando correção do nginx..."
bash fix-nginx-upload-limits.sh

# 5. Verificar se correção foi aplicada
if grep -q "client_max_body_size 50M" /etc/nginx/sites-available/credcar; then
    echo "✅ Correção do nginx aplicada com sucesso!"
else
    echo "❌ Falha na correção do nginx!"
    exit 1
fi

# 6. Testar configuração nginx
echo "🧪 Testando configuração nginx..."
if sudo nginx -t; then
    echo "✅ Configuração nginx válida!"
    sudo systemctl reload nginx
else
    echo "❌ Configuração nginx inválida!"
    exit 1
fi

# 7. Reiniciar upload-server
echo "🔄 Reiniciando upload-server..."
pm2 restart upload-server

# 8. Verificar se upload-server está funcionando
echo "🧪 Testando upload-server..."
sleep 3
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Upload-server funcionando!"
else
    echo "❌ Upload-server com problemas!"
    pm2 logs upload-server --lines 10
    exit 1
fi

# 9. Reiniciar frontend
echo "🔄 Reiniciando frontend..."
pm2 restart credcar-frontend

# 10. Verificar status final
echo "📊 Status final dos serviços:"
pm2 status

echo ""
echo "🎯 LIMITES CONFIGURADOS:"
echo "- Nginx: 50MB (client_max_body_size)"
echo "- Upload-server: 50MB (multer limits)"
echo "- Timeouts: 60s (body), 300s (proxy)"
echo ""
echo "✅ CORREÇÃO COMPLETA APLICADA!"
echo "Agora você pode fazer upload de arquivos até 50MB"
echo ""
echo "🧪 TESTE RECOMENDADO:"
echo "1. Acesse o sistema"
echo "2. Tente fazer upload de um arquivo grande (>10MB)"
echo "3. Verifique se não aparece mais erro 413"

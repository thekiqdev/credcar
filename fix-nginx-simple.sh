#!/bin/bash

# Script para corrigir configuração do Nginx - Versão Simplificada
# Execute este script no servidor VPS

echo "🔧 Aplicando correção do Nginx para uploads maiores..."

# Backup da configuração atual
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Verificar se já existe a configuração
if grep -q "client_max_body_size" /etc/nginx/sites-available/default; then
    echo "⚠️  Configuração já existe, atualizando..."
    # Remover configuração antiga
    sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/default
fi

# Adicionar configuração no início do arquivo (após server {)
sudo sed -i '/server {/a\    client_max_body_size 15M;' /etc/nginx/sites-available/default

# Testar configuração
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração válida!"
    
    # Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx recarregado!"
    echo "📋 Configuração aplicada: client_max_body_size 15M"
else
    echo "❌ Erro na configuração!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    exit 1
fi

echo "🎉 Correção aplicada com sucesso!"
echo "📝 Próximos passos:"
echo "   1. Reiniciar upload-server: sudo pm2 restart upload-server"
echo "   2. Testar upload novamente"

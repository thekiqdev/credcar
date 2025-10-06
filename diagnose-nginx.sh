#!/bin/bash

# Script para diagnosticar e corrigir Nginx
echo "🔍 DIAGNÓSTICO NGINX"
echo "===================="

# 1. Mostrar estrutura atual
echo "📋 Estrutura atual do arquivo:"
echo "Últimas 15 linhas:"
tail -15 /etc/nginx/sites-available/credcar

echo ""
echo "📊 Linhas que contêm 'location':"
grep -n "location" /etc/nginx/sites-available/credcar

echo ""
echo "📊 Linhas que contêm '}':"
grep -n "}" /etc/nginx/sites-available/credcar | tail -5

echo ""
echo "🎯 INSTRUÇÕES:"
echo "1. Edite o arquivo: sudo nano /etc/nginx/sites-available/credcar"
echo "2. Encontre o último '}' que fecha o bloco 'server'"
echo "3. Adicione ANTES dele a configuração de proxy"
echo "4. Teste: sudo nginx -t"
echo "5. Recarregue: sudo systemctl reload nginx"

echo ""
echo "📝 CONFIGURAÇÃO PARA ADICIONAR:"
cat << 'EOF'
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

#!/bin/bash

# Script para verificar configuração atual do Nginx
echo "🔍 VERIFICANDO CONFIGURAÇÃO ATUAL DO NGINX"
echo "=========================================="

# 1. Verificar se nginx está rodando
echo "📊 Status do Nginx:"
sudo systemctl status nginx --no-pager -l

echo ""
echo "📊 Configuração atual do arquivo credcar:"
echo "Últimas 30 linhas:"
tail -30 /etc/nginx/sites-available/credcar

echo ""
echo "📊 Procurando por configurações de upload:"
echo "client_max_body_size:"
grep -n "client_max_body_size" /etc/nginx/sites-available/credcar || echo "❌ Não encontrado"

echo ""
echo "client_body_timeout:"
grep -n "client_body_timeout" /etc/nginx/sites-available/credcar || echo "❌ Não encontrado"

echo ""
echo "location /api/:"
grep -n "location /api/" /etc/nginx/sites-available/credcar || echo "❌ Não encontrado"

echo ""
echo "📊 Testando configuração:"
if sudo nginx -t; then
    echo "✅ Configuração válida!"
else
    echo "❌ Configuração inválida!"
fi

echo ""
echo "📊 Verificando logs de erro recentes:"
sudo tail -10 /var/log/nginx/error.log

echo ""
echo "📊 Verificando se upload-server está rodando:"
pm2 status | grep upload-server || echo "❌ Upload server não encontrado"

echo ""
echo "📊 Testando health check do upload-server:"
curl -s http://localhost:3001/api/health || echo "❌ Upload server não responde"

echo ""
echo "🎯 DIAGNÓSTICO COMPLETO!"

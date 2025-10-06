#!/bin/bash

# Script para diagnosticar reinícios constantes do servidor
echo "🔍 DIAGNÓSTICO DE REINÍCIOS CONSTANTES"
echo "====================================="

# 1. Verificar status atual do PM2
echo "📊 Status atual do PM2:"
pm2 status

echo ""
echo "📋 Logs recentes do PM2:"
pm2 logs --lines 20

echo ""
echo "📊 Estatísticas de reinícios:"
pm2 show credcar-upload-server | grep -E "(restart time|unstable restarts|restarts)"

# 2. Verificar logs do sistema
echo ""
echo "🔍 Logs do sistema (últimas 20 linhas):"
journalctl -u nginx --lines 20 --no-pager

# 3. Verificar uso de memória
echo ""
echo "💾 Uso de memória:"
free -h

# 4. Verificar processos Node.js
echo ""
echo "🟢 Processos Node.js:"
ps aux | grep node | grep -v grep

# 5. Verificar portas em uso
echo ""
echo "🌐 Portas em uso:"
netstat -tlnp | grep -E "(3001|443|80)"

# 6. Verificar espaço em disco
echo ""
echo "💿 Espaço em disco:"
df -h

# 7. Verificar logs específicos do upload server
echo ""
echo "📋 Logs específicos do upload server:"
pm2 logs credcar-upload-server --lines 10

# 8. Verificar configuração do PM2
echo ""
echo "⚙️ Configuração do PM2:"
pm2 show credcar-upload-server

echo ""
echo "🎯 POSSÍVEIS CAUSAS:"
echo "1. Uso excessivo de memória"
echo "2. Erro no código causando crash"
echo "3. Conflito de portas"
echo "4. Problema de permissões"
echo "5. Espaço em disco insuficiente"
echo "6. Configuração incorreta do PM2"

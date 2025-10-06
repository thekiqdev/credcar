#!/bin/bash

# Script para diagnosticar reinícios constantes do servidor
echo "🔍 DIAGNÓSTICO: SERVIDOR REINICIANDO CONSTANTEMENTE"
echo "=================================================="

# 1. Verificar logs do PM2
echo "📊 Logs do PM2 (últimas 20 linhas):"
pm2 logs --lines 20

echo ""
echo "📊 Status detalhado do PM2:"
pm2 status

echo ""
echo "📊 Informações de memória e CPU:"
pm2 monit --no-interaction | head -20

# 2. Verificar logs do sistema
echo ""
echo "📋 Logs do sistema (últimas 10 linhas):"
journalctl -u nginx --no-pager -l | tail -10

# 3. Verificar uso de recursos
echo ""
echo "💾 Uso de recursos do sistema:"
free -h
df -h | grep -E "(Filesystem|/dev/)"

# 4. Verificar processos Node.js
echo ""
echo "🟢 Processos Node.js ativos:"
ps aux | grep node | grep -v grep

# 5. Verificar configuração do PM2
echo ""
echo "⚙️ Configuração do PM2:"
pm2 show credcar-upload-server

# 6. Verificar se há erros nos logs do upload server
echo ""
echo "📝 Logs específicos do upload server:"
pm2 logs credcar-upload-server --lines 10

# 7. Verificar se há problemas de memória
echo ""
echo "🧠 Verificação de memória:"
cat /proc/meminfo | grep -E "(MemTotal|MemAvailable|MemFree)"

echo ""
echo "🎯 POSSÍVEIS CAUSAS:"
echo "1. Erro de memória (OOM Killer)"
echo "2. Erro no código do upload server"
echo "3. Configuração incorreta do PM2"
echo "4. Problema com dependências"
echo "5. Conflito de portas"
echo "6. Erro de sintaxe no código"

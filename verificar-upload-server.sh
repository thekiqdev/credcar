#!/bin/bash

# VERIFICAR SE O UPLOAD-SERVER ESTÁ FUNCIONANDO
# Execute este comando para testar o servidor diretamente

echo "🔍 VERIFICANDO UPLOAD-SERVER"
echo "============================"

# 1. Verificar status do PM2
echo "📊 Status do PM2:"
sudo pm2 status

# 2. Verificar logs do upload-server
echo "📋 Logs do upload-server (últimas 10 linhas):"
sudo pm2 logs upload-server --lines 10 --nostream

# 3. Testar se o servidor está respondendo
echo "🧪 Testando se o servidor está respondendo..."
curl -s http://localhost:3001/health || echo "❌ Servidor não está respondendo"

# 4. Verificar se a porta 3001 está aberta
echo "🔍 Verificando porta 3001:"
sudo netstat -tlnp | grep :3001 || echo "❌ Porta 3001 não está aberta"

# 5. Verificar configuração do Nginx
echo "📋 Configuração do Nginx:"
sudo grep -A10 "location = /api/upload-document" /etc/nginx/sites-available/default

# 6. Testar configuração do Nginx
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "-------------------"
echo "1. Se o servidor não está respondendo, execute:"
echo "   sudo pm2 restart upload-server"
echo ""
echo "2. Se a configuração do Nginx está incorreta, execute:"
echo "   chmod +x fix-413-definitivo.sh"
echo "   ./fix-413-definitivo.sh"
echo ""
echo "3. Se tudo está funcionando, teste o upload novamente"

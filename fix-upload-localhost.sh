#!/bin/bash

# SOLUÇÃO TEMPORÁRIA - MODIFICAR FRONTEND PARA LOCALHOST:3001
# Alterar a URL de upload no frontend para contornar o Nginx

echo "🔧 APLICANDO SOLUÇÃO TEMPORÁRIA - LOCALHOST:3001"
echo "==============================================="

# 1. Verificar se o upload-server está rodando
echo "📊 Verificando upload-server..."
sudo pm2 status upload-server

# 2. Verificar se a porta 3001 está acessível
echo "📊 Verificando porta 3001..."
sudo netstat -tlnp | grep :3001

# 3. Testar acesso direto
echo "🧪 Testando acesso direto ao upload-server..."
curl -s http://localhost:3001/health

# 4. Configurar firewall se necessário
echo "🔧 Configurando firewall para porta 3001..."
sudo ufw allow 3001

echo ""
echo "🎉 CONFIGURAÇÃO APLICADA!"
echo "========================="
echo "✅ Porta 3001 liberada"
echo "✅ Upload-server acessível diretamente"
echo ""
echo "📝 PRÓXIMA ETAPA:"
echo "   - Modificar o frontend para usar:"
echo "     http://localhost:3001/api/upload-document"
echo "   - Ou usar o IP do servidor:"
echo "     http://SEU_IP:3001/api/upload-document"
echo ""
echo "🌐 URLs para teste:"
echo "   - http://localhost:3001/health"
echo "   - http://localhost:3001/api/upload-document"

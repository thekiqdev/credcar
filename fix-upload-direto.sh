#!/bin/bash

# SOLUÇÃO MAIS SIMPLES - UPLOAD DIRETO PARA PORTA 3001
# Configurar o frontend para fazer upload diretamente para localhost:3001

echo "🔧 APLICANDO SOLUÇÃO MAIS SIMPLES - UPLOAD DIRETO"
echo "================================================"

# 1. Verificar se o upload-server está rodando
echo "📊 Verificando upload-server..."
sudo pm2 status upload-server

# 2. Verificar se a porta 3001 está aberta
echo "📊 Verificando porta 3001..."
sudo netstat -tlnp | grep :3001

# 3. Configurar firewall para permitir acesso direto à porta 3001
echo "🔧 Configurando firewall..."
sudo ufw allow 3001

# 4. Verificar se o upload-server está acessível
echo "🧪 Testando acesso direto ao upload-server..."
curl -s http://localhost:3001/health || echo "❌ Upload-server não está respondendo"

echo ""
echo "🎉 CONFIGURAÇÃO APLICADA!"
echo "========================="
echo "✅ Porta 3001 liberada no firewall"
echo "✅ Upload-server deve estar acessível diretamente"
echo ""
echo "📝 PRÓXIMA ETAPA:"
echo "   - Modificar o frontend para usar localhost:3001"
echo "   - Ou configurar proxy reverso sem limitações"
echo ""
echo "🌐 URLs para teste:"
echo "   - http://localhost:3001/health"
echo "   - http://localhost:3001/api/upload-document"

#!/bin/bash

# Script de Deploy para CredCar Finance v1.1
# Versão com sistema de upload funcional e avatares padronizados

echo "🚀 Iniciando deploy do CredCar Finance v1.1..."

# 1. Parar serviços
echo "⏹️ Parando serviços..."
pm2 stop credcar-frontend 2>/dev/null || true
pm2 stop upload-server 2>/dev/null || true

# 2. Backup da versão atual
echo "💾 Fazendo backup..."
cp -r /var/www/CredCar-Finance /var/www/CredCar-Finance.backup.v1.0.$(date +%Y%m%d_%H%M%S)

# 3. Atualizar código para v1.1
echo "📥 Atualizando código para v1.1..."
cd /var/www/CredCar-Finance
git fetch origin
git checkout v1.1
git pull origin v1.1

# 4. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 5. Build da aplicação
echo "🔨 Fazendo build..."
npm run build

# 6. Instalar dependências do servidor de upload
echo "📦 Instalando dependências do servidor de upload..."
npm install express multer cors helmet morgan

# 7. Criar diretório de documentos
echo "📁 Criando diretório de documentos..."
mkdir -p /var/www/CredCar-Finance/documentos
chown -R www-data:www-data /var/www/CredCar-Finance/documentos
chmod -R 755 /var/www/CredCar-Finance/documentos

# 8. Configurar variáveis de ambiente
echo "⚙️ Configurando variáveis de ambiente..."
if [ ! -f .env.production ]; then
    tee .env.production > /dev/null <<EOF
VITE_SUPABASE_URL=https://cgystsylstnkgfgbqoel.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI
NODE_ENV=production
EOF
fi

# 9. Iniciar serviços
echo "▶️ Iniciando serviços..."
pm2 start upload-server.js --name "upload-server"
pm2 start "npm run preview" --name "credcar-frontend"

# 10. Salvar configuração PM2
echo "💾 Salvando configuração PM2..."
pm2 save

# 11. Recarregar Nginx
echo "🔄 Recarregando Nginx..."
nginx -t && systemctl reload nginx

# 12. Verificar status
echo "✅ Verificando status dos serviços..."
pm2 status

echo "🎉 Deploy da versão v1.1 concluído com sucesso!"
echo "📊 Status dos serviços:"
echo "   - Frontend: https://sistema.credcarmultimarcas.com.br"
echo "   - Upload Server: http://localhost:3001"
echo "   - Documentos: /var/www/CredCar-Finance/documentos"
echo ""
echo "🆕 Novidades da v1.1:"
echo "   ✅ Sistema de upload de documentos totalmente funcional"
echo "   ✅ Avatares padronizados (sem ilustrações aleatórias)"
echo "   ✅ Pastas organizadas por CPF/CNPJ"
echo "   ✅ Servidor de upload estável"
echo "   ✅ Interface limpa e profissional"

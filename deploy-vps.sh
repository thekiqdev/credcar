#!/bin/bash

# Script de Deploy para CredCar Finance
# Atualiza aplicação e configura servidor de upload

echo "🚀 Iniciando deploy do CredCar Finance..."

# 1. Parar serviços
echo "⏹️ Parando serviços..."
sudo pm2 stop credcar-frontend 2>/dev/null || true
sudo pm2 stop upload-server 2>/dev/null || true

# 2. Backup da versão atual
echo "💾 Fazendo backup..."
sudo cp -r /var/www/CredCar-Finance /var/www/CredCar-Finance.backup.$(date +%Y%m%d_%H%M%S)

# 3. Atualizar código
echo "📥 Atualizando código..."
cd /var/www/CredCar-Finance
git pull origin deploy-v1.0

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
sudo mkdir -p /var/www/CredCar-Finance/documentos
sudo chown -R www-data:www-data /var/www/CredCar-Finance/documentos
sudo chmod -R 755 /var/www/CredCar-Finance/documentos

# 8. Configurar variáveis de ambiente
echo "⚙️ Configurando variáveis de ambiente..."
if [ ! -f .env.production ]; then
    sudo tee .env.production > /dev/null <<EOF
VITE_SUPABASE_URL=https://cgystsylstnkgfgbqoel.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI
NODE_ENV=production
EOF
fi

# 9. Iniciar serviços
echo "▶️ Iniciando serviços..."
sudo pm2 start upload-server.js --name "upload-server"
sudo pm2 start "npm run preview" --name "credcar-frontend"

# 10. Salvar configuração PM2
echo "💾 Salvando configuração PM2..."
sudo pm2 save

# 11. Recarregar Nginx
echo "🔄 Recarregando Nginx..."
sudo nginx -t && sudo systemctl reload nginx

# 12. Verificar status
echo "✅ Verificando status dos serviços..."
sudo pm2 status

echo "🎉 Deploy concluído com sucesso!"
echo "📊 Status dos serviços:"
echo "   - Frontend: https://sistema.credcarmultimarcas.com.br"
echo "   - Upload Server: http://localhost:3001"
echo "   - Documentos: /var/www/CredCar-Finance/documentos"

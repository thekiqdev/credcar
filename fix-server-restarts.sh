#!/bin/bash

# Script para corrigir problemas de reinícios constantes
echo "🔧 CORRIGINDO PROBLEMAS DE REINÍCIOS"
echo "===================================="

# 1. Parar todos os processos
echo "🛑 Parando todos os processos PM2..."
pm2 stop all

# 2. Limpar logs antigos
echo "🧹 Limpando logs antigos..."
pm2 flush

# 3. Verificar configuração do upload server
echo "📋 Verificando configuração do upload server..."
if [ -f "upload-server.js" ]; then
    echo "✅ upload-server.js encontrado"
    echo "📊 Tamanho do arquivo:"
    ls -lh upload-server.js
else
    echo "❌ upload-server.js não encontrado"
    exit 1
fi

# 4. Verificar dependências
echo "📦 Verificando dependências..."
if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
    echo "📋 Dependências principais:"
    grep -E "(express|multer|node-fetch)" package.json
else
    echo "❌ package.json não encontrado"
fi

# 5. Verificar se node-fetch está instalado
echo "🔍 Verificando node-fetch..."
if npm list node-fetch > /dev/null 2>&1; then
    echo "✅ node-fetch instalado"
else
    echo "❌ node-fetch não encontrado - instalando..."
    npm install node-fetch
fi

# 6. Criar configuração PM2 otimizada
echo "⚙️ Criando configuração PM2 otimizada..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'credcar-upload-server',
      script: 'upload-server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/upload-server-error.log',
      out_file: './logs/upload-server-out.log',
      log_file: './logs/upload-server-combined.log',
      time: true
    },
    {
      name: 'credcar-frontend',
      script: 'serve',
      args: '-s dist -l 3000',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '100M',
      restart_delay: 5000,
      max_restarts: 5,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# 7. Criar diretório de logs
echo "📁 Criando diretório de logs..."
mkdir -p logs

# 8. Instalar serve se não estiver instalado
echo "📦 Verificando serve..."
if ! command -v serve &> /dev/null; then
    echo "📥 Instalando serve..."
    npm install -g serve
fi

# 9. Reiniciar com nova configuração
echo "🔄 Reiniciando com nova configuração..."
pm2 delete all
pm2 start ecosystem.config.js

# 10. Verificar status
echo "📊 Status após correção:"
pm2 status

echo ""
echo "✅ Correções aplicadas!"
echo "📋 Monitoramento:"
echo "  - pm2 monit (monitor em tempo real)"
echo "  - pm2 logs credcar-upload-server (logs específicos)"
echo "  - pm2 logs (todos os logs)"

# SOLUÇÃO DEFINITIVA PARA ERRO 413 NO HOSTINGER VPS
# Execute estes comandos EXATAMENTE nesta ordem no servidor:

echo "🔧 APLICANDO CORREÇÃO DEFINITIVA DO NGINX..."

# 1. Fazer backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# 2. Verificar arquivo atual
echo "📋 Arquivo atual do Nginx:"
sudo head -20 /etc/nginx/sites-available/default

# 3. Adicionar configuração ANTES do primeiro location
sudo sed -i '/location \/ {/i\    client_max_body_size 15M;\n    client_body_timeout 60s;\n    client_header_timeout 60s;' /etc/nginx/sites-available/default

# 4. Verificar se foi adicionado
echo "📋 Verificando configuração adicionada:"
sudo grep -A5 -B5 "client_max_body_size" /etc/nginx/sites-available/default

# 5. Testar configuração
echo "🧪 Testando configuração..."
sudo nginx -t

# 6. Se teste passou, aplicar
if [ $? -eq 0 ]; then
    echo "✅ Configuração válida! Aplicando..."
    sudo systemctl reload nginx
    echo "✅ Nginx recarregado!"
    
    # 7. Reiniciar upload-server
    sudo pm2 restart upload-server
    echo "✅ Upload-server reiniciado!"
    
    # 8. Verificar status
    sudo pm2 status
    echo "🎉 CORREÇÃO APLICADA COM SUCESSO!"
else
    echo "❌ Erro na configuração! Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    exit 1
fi

echo "📝 TESTE AGORA: Faça upload do arquivo credenciamento.pdf"

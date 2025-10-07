#!/bin/bash

# Script para configurar Nginx para upload de arquivos grandes
# Execute este script no servidor Hostinger

echo "🔧 Configurando Nginx para upload de arquivos grandes..."

# Backup da configuração atual
echo "📋 Fazendo backup da configuração atual..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Verificar se o arquivo de configuração existe
if [ ! -f "/etc/nginx/sites-available/default" ]; then
    echo "❌ Arquivo de configuração do Nginx não encontrado!"
    exit 1
fi

# Adicionar configurações de upload ao arquivo de configuração
echo "📝 Adicionando configurações de upload..."

# Criar arquivo temporário com as configurações
cat > /tmp/nginx_upload_config.txt << 'EOF'

# Configurações para upload de arquivos grandes
client_max_body_size 50M;
client_body_timeout 60s;
client_header_timeout 60s;

# Configurações para proxy do upload-server
location /api/upload-document {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Configurações específicas para upload
    proxy_request_buffering off;
    proxy_buffering off;
    proxy_read_timeout 300s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    
    # Headers para arquivos grandes
    proxy_set_header Content-Length $content_length;
    proxy_set_header Content-Type $content_type;
}

location /api/create-folder {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/list-files {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

EOF

# Verificar se as configurações já existem
if grep -q "client_max_body_size 50M" /etc/nginx/sites-available/default; then
    echo "⚠️  Configurações de upload já existem no Nginx!"
    echo "🔄 Removendo configurações antigas..."
    
    # Remover configurações antigas
    sudo sed -i '/client_max_body_size/d' /etc/nginx/sites-available/default
    sudo sed -i '/client_body_timeout/d' /etc/nginx/sites-available/default
    sudo sed -i '/client_header_timeout/d' /etc/nginx/sites-available/default
    sudo sed -i '/location \/api\/upload-document/,/^}/d' /etc/nginx/sites-available/default
    sudo sed -i '/location \/api\/create-folder/,/^}/d' /etc/nginx/sites-available/default
    sudo sed -i '/location \/api\/list-files/,/^}/d' /etc/nginx/sites-available/default
fi

# Adicionar as novas configurações
echo "➕ Adicionando novas configurações..."
sudo sed -i '/server {/r /tmp/nginx_upload_config.txt' /etc/nginx/sites-available/default

# Testar configuração
echo "🧪 Testando configuração do Nginx..."
if sudo nginx -t; then
    echo "✅ Configuração do Nginx válida!"
    
    # Recarregar Nginx
    echo "🔄 Recarregando Nginx..."
    sudo systemctl reload nginx
    
    echo "✅ Nginx configurado com sucesso!"
    echo "📊 Configurações aplicadas:"
    echo "   - client_max_body_size: 50M"
    echo "   - Timeouts aumentados para 60s"
    echo "   - Proxy configurado para upload-server"
    echo "   - Buffering desabilitado para uploads"
    
else
    echo "❌ Erro na configuração do Nginx!"
    echo "🔄 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    exit 1
fi

# Limpar arquivo temporário
rm -f /tmp/nginx_upload_config.txt

echo "🎉 Configuração concluída com sucesso!"
echo "📝 Para verificar se está funcionando, teste um upload de arquivo grande."

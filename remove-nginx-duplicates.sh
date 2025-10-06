#!/bin/bash

# Script simples para remover duplicatas do Nginx
echo "🧹 Removendo duplicatas do Nginx..."

# 1. Backup
sudo cp /etc/nginx/sites-available/credcar /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S)

# 2. Mostrar quantas linhas tem o arquivo
echo "📊 Arquivo atual tem $(wc -l < /etc/nginx/sites-available/credcar) linhas"

# 3. Remover linhas duplicadas de location /api/
echo "🗑️ Removendo configurações duplicadas de location /api/..."

# Criar arquivo temporário sem duplicatas
sudo awk '
BEGIN { in_api_location = 0; api_count = 0 }
/^[[:space:]]*location \/api\/ \{/ {
    api_count++
    if (api_count == 1) {
        print $0
        in_api_location = 1
    } else {
        # Pular esta duplicata
        in_api_location = 0
    }
    next
}
in_api_location == 1 && /^[[:space:]]*\}/ {
    print $0
    in_api_location = 0
    next
}
in_api_location == 0 {
    print $0
}
' /etc/nginx/sites-available/credcar > /tmp/nginx_no_duplicates.conf

# 4. Substituir arquivo
sudo cp /tmp/nginx_no_duplicates.conf /etc/nginx/sites-available/credcar

# 5. Mostrar resultado
echo "📊 Arquivo limpo tem $(wc -l < /etc/nginx/sites-available/credcar) linhas"

# 6. Testar
echo "🧪 Testando configuração..."
if sudo nginx -t; then
    echo "✅ Configuração válida!"
    sudo systemctl reload nginx
    echo "✅ Nginx recarregado!"
else
    echo "❌ Ainda há problemas. Restaurando backup..."
    sudo cp /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/credcar
fi

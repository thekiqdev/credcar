# SOLUÇÃO MANUAL PARA CONFIGURAR NGINX

## 🔧 COMANDOS PARA EXECUTAR NA VPS:

### 1. Verificar estrutura atual do arquivo
```bash
echo "=== ESTRUTURA ATUAL ==="
cat /etc/nginx/sites-available/credcar
```

### 2. Fazer backup
```bash
sudo cp /etc/nginx/sites-available/credcar /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S)
```

### 3. Editar arquivo manualmente
```bash
sudo nano /etc/nginx/sites-available/credcar
```

### 4. LOCALIZAR ONDE INSERIR
Procure por uma linha que contenha apenas `}` (fechamento do bloco server)

### 5. INSERIR ANTES DO ÚLTIMO }
Adicione estas linhas ANTES do último `}`:

```nginx
    # Proxy para upload server
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
```

### 6. Salvar e testar
```bash
# Testar configuração
sudo nginx -t

# Se OK, recarregar
sudo systemctl reload nginx
```

## 🎯 ESTRUTURA ESPERADA:

O arquivo deve ficar assim:

```nginx
server {
    listen 443 ssl;
    server_name sistema.credcarmultimarcas.com.br;
    
    # ... outras configurações ...
    
    # Proxy para upload server
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

## 🚨 IMPORTANTE:
- A configuração `location /api/` deve estar DENTRO do bloco `server { }`
- Deve estar ANTES do último `}` que fecha o bloco server
- Não deve estar dentro de outro bloco `location`

# INSTRUÇÕES PARA ATUALIZAR VPS

## 🚀 COMANDOS PARA EXECUTAR NA VPS:

### 1. Atualizar Código
```bash
cd /var/www/CredCar-Finance
git pull origin deploy-v1.2
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Fazer Build
```bash
npm run build
```

### 4. Configurar Nginx (IMPORTANTE!)
```bash
# Editar configuração do Nginx
sudo nano /etc/nginx/sites-available/credcar
```

### 5. Adicionar Proxy no Nginx
Adicione este bloco ANTES do último `}` no arquivo:

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

### 6. Testar e Recarregar Nginx
```bash
# Testar configuração
sudo nginx -t

# Se OK, recarregar
sudo systemctl reload nginx
```

### 7. Reiniciar Upload Server
```bash
pm2 restart credcar-upload-server
```

### 8. Verificar Status
```bash
# Verificar PM2
pm2 status

# Verificar logs
pm2 logs credcar-upload-server --lines 5

# Testar health check
curl http://localhost:3001/api/health
```

## 🧪 TESTES:

### Teste 1: Health Check
```bash
curl http://localhost:3001/api/health
```

### Teste 2: Proxy ASAAS
```bash
curl -X POST http://localhost:3001/api/proxy/asaas \
  -H "Content-Type: application/json" \
  -d '{"url":"myAccount","key":"test","env":"sandbox","method":"GET"}'
```

### Teste 3: Frontend
Acesse: https://sistema.credcarmultimarcas.com.br

## 🔍 DIAGNÓSTICO:

Se ainda não funcionar:

### Verificar se Upload Server está rodando:
```bash
pm2 status
netstat -tlnp | grep 3001
```

### Verificar logs:
```bash
pm2 logs credcar-upload-server
```

### Verificar Nginx:
```bash
sudo nginx -t
sudo systemctl status nginx
```

## ✅ RESULTADO ESPERADO:

- ✅ Frontend carregando normalmente
- ✅ Teste ASAAS funcionando
- ✅ Upload de documentos funcionando
- ✅ Servidor independente do terminal local

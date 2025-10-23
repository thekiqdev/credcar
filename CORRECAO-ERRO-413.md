# CORREÇÃO DO ERRO 413 - REQUEST ENTITY TOO LARGE

## 🔍 **PROBLEMA IDENTIFICADO:**
O erro `413 (Request Entity Too Large)` ocorre quando arquivos grandes são enviados para o servidor. Isso acontece porque:

1. **Nginx** tem limite padrão de 1MB para uploads
2. **Upload-server** estava configurado para máximo 10MB
3. **Falta de configuração** de timeouts adequados

## 🔧 **CORREÇÕES APLICADAS:**

### **1. Upload-server.js:**
- ✅ Aumentado limite de `10MB` para `50MB`
- ✅ Atualizado em 3 locais diferentes no código
- ✅ Validações de tamanho atualizadas

### **2. src/api/documentUpload.ts:**
- ✅ Aumentado limite de `10MB` para `50MB`
- ✅ Validação de contrato social atualizada para `50MB`

### **3. Scripts criados:**
- ✅ `fix-nginx-upload-limits.sh` - Corrige configuração do nginx
- ✅ `check-nginx-status.sh` - Verifica status atual
- ✅ `deploy-upload-fix.sh` - Aplica todas as correções

## 🚀 **COMANDOS PARA APLICAR NA VPS:**

### **Opção 1 - Aplicação automática:**
```bash
cd /var/www/CredCar-Finance
bash deploy-upload-fix.sh
```

### **Opção 2 - Aplicação manual:**
```bash
# 1. Fazer backup
sudo cp /etc/nginx/sites-available/credcar /etc/nginx/sites-available/credcar.backup.$(date +%Y%m%d_%H%M%S)

# 2. Aplicar correção nginx
bash fix-nginx-upload-limits.sh

# 3. Reiniciar serviços
pm2 restart all

# 4. Testar
curl http://localhost:3001/api/health
```

## 📋 **CONFIGURAÇÕES APLICADAS:**

### **Nginx:**
```nginx
client_max_body_size 50M;
client_body_timeout 60s;
client_header_timeout 60s;

location /api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
    proxy_send_timeout 300s;
    client_max_body_size 50M;
    client_body_timeout 60s;
}
```

### **Upload-server:**
```javascript
limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
}
```

## 🧪 **TESTES RECOMENDADOS:**

1. **Teste básico:** Upload de arquivo pequeno (< 1MB)
2. **Teste médio:** Upload de arquivo médio (5-10MB)
3. **Teste grande:** Upload de arquivo grande (20-30MB)
4. **Teste limite:** Upload de arquivo próximo ao limite (45-50MB)

## ⚠️ **IMPORTANTE:**

- **Backup automático** da configuração nginx antes das alterações
- **Validação** da configuração antes de aplicar
- **Rollback** automático em caso de erro
- **Logs detalhados** para diagnóstico

## 🎯 **RESULTADO ESPERADO:**

- ✅ Uploads até 50MB funcionando
- ✅ Sem mais erro 413
- ✅ Timeouts adequados
- ✅ Resposta JSON correta (não mais HTML de erro)

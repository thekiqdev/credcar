# 🚀 DEPLOY NA HOSTINGER VPS - GUIA COMPLETO

## 📋 **PRÉ-REQUISITOS:**
- ✅ SSH conectado na VPS Hostinger
- ✅ Repositório GitHub com branch `deploy-v1.0`
- ✅ Domínio configurado (opcional)

---

## 🔧 **PASSO 1: ATUALIZAR SISTEMA**

```bash
# Atualizar pacotes do sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências necessárias
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx
```

---

## 🔧 **PASSO 2: INSTALAR NODE.JS**

```bash
# Instalar Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

---

## 🔧 **PASSO 3: CLONAR REPOSITÓRIO**

```bash
# Navegar para diretório web
cd /var/www

# Clonar repositório
sudo git clone https://github.com/thekiqdev/CredCar-Finance.git

# Mudar para branch de deploy
cd CredCar-Finance
sudo git checkout deploy-v1.0

# Definir permissões
sudo chown -R www-data:www-data /var/www/CredCar-Finance
sudo chmod -R 755 /var/www/CredCar-Finance
```

---

## 🔧 **PASSO 4: INSTALAR DEPENDÊNCIAS**

```bash
# Navegar para diretório do projeto
cd /var/www/CredCar-Finance

# Instalar dependências
sudo npm install

# Fazer build de produção
sudo npm run build
```

---

## 🔧 **PASSO 5: CONFIGURAR NGINX**

```bash
# Criar arquivo de configuração do Nginx
sudo nano /etc/nginx/sites-available/credcar
```

**Conteúdo do arquivo `/etc/nginx/sites-available/credcar`:**

```nginx
server {
    listen 80;
    server_name _;
    
    root /var/www/CredCar-Finance/dist;
    index index.html;
    
    # Configuração para SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Configuração para arquivos estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Configuração para uploads de documentos
    location /documentos/ {
        alias /var/www/CredCar-Finance/documentos/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Proxy para servidor de upload
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Proxy para servidor de upload
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Configuração de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

```bash
# Habilitar site
sudo ln -s /etc/nginx/sites-available/credcar /etc/nginx/sites-enabled/

# Remover site padrão (IMPORTANTE!)
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Verificar se está funcionando
curl -I http://localhost
```

---

## 🔧 **TROUBLESHOOTING - PÁGINA PADRÃO DO NGINX**

Se você ver a página "Welcome to nginx!" em vez da aplicação:

```bash
# 1. Verificar se o site padrão foi removido
sudo ls -la /etc/nginx/sites-enabled/

# 2. Se ainda existir o arquivo 'default', removê-lo
sudo rm -f /etc/nginx/sites-enabled/default

# 3. Verificar se nosso site está ativo
sudo ls -la /etc/nginx/sites-enabled/credcar

# 4. Recarregar configuração
sudo nginx -s reload

# 5. Verificar logs
sudo tail -f /var/log/nginx/error.log
```

**Se ainda não funcionar, use configuração direta:**

```bash
# Editar configuração principal
sudo nano /etc/nginx/nginx.conf
```

**Adicione dentro do bloco `http {`:**

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/CredCar-Finance/dist;
    index index.html;
    
    server_name _;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /documentos/ {
        alias /var/www/CredCar-Finance/documentos/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Proxy para servidor de upload
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Testar e recarregar
sudo nginx -t
sudo nginx -s reload
```

---

## 🔧 **PASSO 6: CONFIGURAR SSL (HTTPS)**

```bash
# Instalar certificado SSL com Let's Encrypt
sudo certbot --nginx -d SEU_DOMINIO_AQUI

# Verificar renovação automática
sudo certbot renew --dry-run
```

---

## 🔧 **PASSO 7: CONFIGURAR VARIÁVEIS DE AMBIENTE**

```bash
# Criar arquivo .env de produção
sudo nano /var/www/CredCar-Finance/.env.production
```

**Conteúdo do arquivo `.env.production`:**

```env
VITE_SUPABASE_URL=https://cgystsylstnkgfgbqoel.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI
NODE_ENV=production
```

---

## 🔧 **PASSO 8: CONFIGURAR FIREWALL**

```bash
# Configurar UFW (Uncomplicated Firewall)
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Verificar status
sudo ufw status
```

---

## 🔧 **PASSO 9: CONFIGURAR BACKUP AUTOMÁTICO**

```bash
# Criar script de backup
sudo nano /usr/local/bin/backup-credcar.sh
```

**Conteúdo do script de backup:**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/credcar"
PROJECT_DIR="/var/www/CredCar-Finance"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup do projeto
tar -czf $BACKUP_DIR/credcar_$DATE.tar.gz -C /var/www CredCar-Finance

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "credcar_*.tar.gz" -mtime +7 -delete

echo "Backup criado: credcar_$DATE.tar.gz"
```

```bash
# Tornar script executável
sudo chmod +x /usr/local/bin/backup-credcar.sh

# Configurar cron para backup diário
sudo crontab -e
```

**Adicionar linha no crontab:**
```
0 2 * * * /usr/local/bin/backup-credcar.sh
```

---

## 🔧 **PASSO 10: CONFIGURAR MONITORAMENTO**

```bash
# Instalar PM2 para gerenciamento de processos
sudo npm install -g pm2

# Criar arquivo de configuração PM2
sudo nano /var/www/CredCar-Finance/ecosystem.config.js
```

**Conteúdo do arquivo `ecosystem.config.js`:**

```javascript
module.exports = {
  apps: [{
    name: 'credcar-frontend',
    script: 'npm',
    args: 'run preview',
    cwd: '/var/www/CredCar-Finance',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/credcar-error.log',
    out_file: '/var/log/pm2/credcar-out.log',
    log_file: '/var/log/pm2/credcar-combined.log',
    time: true
  }]
};
```

```bash
# Iniciar aplicação com PM2
cd /var/www/CredCar-Finance
sudo pm2 start ecosystem.config.js

# Salvar configuração PM2
sudo pm2 save

# Configurar PM2 para iniciar com o sistema
sudo pm2 startup
```

---

## 🔧 **PASSO 11: CONFIGURAR LOGS**

```bash
# Criar diretório de logs
sudo mkdir -p /var/log/credcar

# Configurar rotação de logs
sudo nano /etc/logrotate.d/credcar
```

**Conteúdo do arquivo `/etc/logrotate.d/credcar`:**

```
/var/log/credcar/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

---

## 🔧 **PASSO 12: TESTAR DEPLOY**

```bash
# Verificar status dos serviços
sudo systemctl status nginx
sudo pm2 status

# Verificar logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
sudo pm2 logs credcar-frontend

# Testar aplicação
curl -I http://localhost
curl -I https://SEU_DOMINIO_AQUI
```

---

## 🔧 **PASSO 13: CONFIGURAR ATUALIZAÇÕES AUTOMÁTICAS**

```bash
# Criar script de atualização
sudo nano /usr/local/bin/update-credcar.sh
```

**Conteúdo do script de atualização:**

```bash
#!/bin/bash
PROJECT_DIR="/var/www/CredCar-Finance"

echo "Iniciando atualização do CredCar Finance..."

# Parar aplicação
cd $PROJECT_DIR
sudo pm2 stop credcar-frontend

# Fazer backup
sudo /usr/local/bin/backup-credcar.sh

# Atualizar código
sudo git fetch origin
sudo git checkout deploy-v1.0
sudo git pull origin deploy-v1.0

# Instalar dependências
sudo npm install

# Fazer build
sudo npm run build

# Reiniciar aplicação
sudo pm2 restart credcar-frontend

echo "Atualização concluída!"
```

```bash
# Tornar script executável
sudo chmod +x /usr/local/bin/update-credcar.sh
```

---

## 🎯 **COMANDOS RÁPIDOS PARA DEPLOY:**

### **Deploy Inicial Completo:**
```bash
# 1. Atualizar sistema
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clonar repositório
cd /var/www
sudo git clone https://github.com/thekiqdev/CredCar-Finance.git
cd CredCar-Finance
sudo git checkout deploy-v1.0
sudo chown -R www-data:www-data /var/www/CredCar-Finance

# 4. Instalar dependências e build
sudo npm install
sudo npm run build

# 5. Configurar Nginx (copiar configuração acima)
sudo nano /etc/nginx/sites-available/credcar
sudo ln -s /etc/nginx/sites-available/credcar /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 6. Configurar SSL
sudo certbot --nginx -d SEU_DOMINIO_AQUI

# 7. Configurar servidor de upload de documentos
cd /var/www/CredCar-Finance
npm install express multer cors helmet morgan
sudo pm2 start upload-server.js --name "upload-server"
sudo pm2 save
sudo pm2 startup

# 8. Configurar firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3001  # Porta do servidor de upload
sudo ufw --force enable
```

### **Configuração do Servidor de Upload:**
```bash
# Verificar se o servidor está rodando
sudo pm2 status upload-server

# Ver logs do servidor de upload
sudo pm2 logs upload-server

# Reiniciar servidor de upload
sudo pm2 restart upload-server

# Parar servidor de upload
sudo pm2 stop upload-server
```

### **Atualizações Futuras:**
```bash
# Atualizar aplicação
sudo /usr/local/bin/update-credcar.sh

# Verificar status
sudo pm2 status
sudo systemctl status nginx
```

---

## 🚨 **IMPORTANTE:**

### **⚠️ Substitua os seguintes valores:**
- `SEU_DOMINIO_AQUI` → Seu domínio real (ex: credcar.com.br)
- `SEU_DOMINIO_AQUI` → Seu domínio real em todas as configurações

### **⚠️ Verificações de Segurança:**
- ✅ Firewall configurado
- ✅ SSL habilitado
- ✅ Permissões corretas
- ✅ Logs configurados
- ✅ Backup automático

### **⚠️ Monitoramento:**
- ✅ PM2 para gerenciamento de processos
- ✅ Nginx para servidor web
- ✅ Logs centralizados
- ✅ Backup diário

---

## 🎉 **DEPLOY CONCLUÍDO!**

Após seguir todos os passos, seu sistema CredCar Finance estará rodando em produção na VPS da Hostinger!

**URL de acesso:** `https://SEU_DOMINIO_AQUI`

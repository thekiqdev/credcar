# Instruções para Aplicar Migração - Sistema de Configurações Gerais

## 📋 **Resumo das Alterações**

Este deploy implementa um sistema completo de configurações gerais com upload de logo e salvamento no banco de dados.

### **🔧 Funcionalidades Implementadas:**

1. **Tabela `system_general_config`** - Armazena configurações do sistema
2. **Upload de Logo** - Substitui campo de URL por upload de arquivo
3. **Salvamento Automático** - Configurações são salvas no banco de dados
4. **Validação de Arquivos** - Apenas imagens (JPEG, PNG, GIF, SVG) até 5MB

---

## 🗄️ **1. Aplicar Migração do Banco de Dados**

### **Passo 1: Acessar Supabase SQL Editor**
1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Clique em **New Query**

### **Passo 2: Executar Migração**
Copie e cole o seguinte SQL:

```sql
-- Migration: Create system_general_config table
-- Description: Create table to store general system configuration settings

-- Drop table if exists to ensure clean creation
DROP TABLE IF EXISTS system_general_config;

-- Create the system_general_config table
CREATE TABLE system_general_config (
  id SERIAL PRIMARY KEY,
  system_name TEXT DEFAULT 'CredCar',
  company_name TEXT DEFAULT 'CredCar Soluções Financeiras',
  company_address TEXT DEFAULT 'Rua das Empresas, 123 - Centro - São Paulo/SP',
  company_phone TEXT DEFAULT '(11) 3000-0000',
  company_email TEXT DEFAULT 'contato@credcar.com.br',
  company_cnpj TEXT DEFAULT '12.345.678/0001-90',
  logo_url TEXT DEFAULT '',
  logo_file_path TEXT DEFAULT '', -- Path to uploaded logo file
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_general_config_updated_at 
    BEFORE UPDATE ON system_general_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration
INSERT INTO system_general_config (
  system_name,
  company_name,
  company_address,
  company_phone,
  company_email,
  company_cnpj,
  logo_url,
  logo_file_path
) VALUES (
  'CredCar',
  'CredCar Soluções Financeiras',
  'Rua das Empresas, 123 - Centro - São Paulo/SP',
  '(11) 3000-0000',
  'contato@credcar.com.br',
  '12.345.678/0001-90',
  '',
  ''
);

-- Add comments for documentation
COMMENT ON TABLE system_general_config IS 'Tabela para armazenar configurações gerais do sistema';
COMMENT ON COLUMN system_general_config.system_name IS 'Nome do sistema';
COMMENT ON COLUMN system_general_config.company_name IS 'Razão social da empresa';
COMMENT ON COLUMN system_general_config.company_address IS 'Endereço completo da empresa';
COMMENT ON COLUMN system_general_config.company_phone IS 'Telefone da empresa';
COMMENT ON COLUMN system_general_config.company_email IS 'Email corporativo da empresa';
COMMENT ON COLUMN system_general_config.company_cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN system_general_config.logo_url IS 'URL do logo (para compatibilidade)';
COMMENT ON COLUMN system_general_config.logo_file_path IS 'Caminho do arquivo do logo no servidor';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_general_config_id ON system_general_config (id);
```

### **Passo 3: Executar Query**
1. Clique em **Run** para executar a migração
2. Verifique se não há erros
3. Confirme que a tabela foi criada

---

## 🚀 **2. Deploy das Alterações**

### **Passo 1: Commit das Alterações**
```bash
git add .
git commit -m "feat: Implement system general settings with logo upload

- Create system_general_config table migration
- Add logo upload endpoint to upload-server.js
- Update generalSettingsService to use database
- Replace URL field with file upload in AdminDashboard
- Implement save functionality for general settings"
```

### **Passo 2: Push para GitHub**
```bash
git push origin deploy-v2.8.3.2
```

### **Passo 3: Deploy na VPS**
1. Acesse a VPS
2. Execute os comandos de deploy
3. Reinicie o servidor se necessário

---

## ✅ **3. Verificação Pós-Deploy**

### **Teste 1: Acessar Configurações**
1. Acesse o sistema como administrador
2. Vá para **Configurações > Geral**
3. Verifique se os campos estão carregados

### **Teste 2: Upload de Logo**
1. Clique em **Escolher arquivo** no campo Logo
2. Selecione uma imagem (JPEG, PNG, GIF, SVG)
3. Verifique se o upload é realizado com sucesso
4. Confirme se a pré-visualização aparece

### **Teste 3: Salvar Configurações**
1. Preencha os campos de informações da empresa
2. Clique em **Salvar Configurações Gerais**
3. Verifique se aparece mensagem de sucesso
4. Recarregue a página e confirme se os dados persistem

### **Teste 4: Verificar Banco de Dados**
1. Acesse Supabase > Table Editor
2. Vá para a tabela `system_general_config`
3. Verifique se os dados foram salvos corretamente

---

## 🔧 **4. Estrutura de Arquivos**

### **Arquivos Criados/Modificados:**
- ✅ `supabase/migrations/20250116000001_create_system_general_config.sql`
- ✅ `upload-server.js` - Novo endpoint `/api/upload-system-logo`
- ✅ `src/lib/supabase.ts` - Atualizado `generalSettingsService`
- ✅ `src/components/dashboard/AdminDashboard.tsx` - Interface de upload e salvamento

### **Estrutura de Diretórios:**
```
documentos/
└── sistema/
    └── logos/
        ├── logo-2025-01-16T10-30-45-123Z.png
        └── logo-2025-01-16T11-15-20-456Z.jpg
```

---

## 🎯 **5. Funcionalidades Implementadas**

### **✅ Upload de Logo:**
- Validação de tipo de arquivo (JPEG, PNG, GIF, SVG)
- Validação de tamanho (máximo 5MB)
- Armazenamento em `documentos/sistema/logos/`
- Geração de URL de download automática

### **✅ Salvamento de Configurações:**
- Nome do Sistema
- Razão Social
- CNPJ
- Endereço Completo
- Telefone
- Email Corporativo
- Logo (URL e caminho do arquivo)

### **✅ Interface Melhorada:**
- Campo de upload substitui campo de URL
- Validação em tempo real
- Feedback visual durante upload
- Pré-visualização do logo
- Botão de salvar com loading state

---

## 🚨 **6. Troubleshooting**

### **Problema: Erro "column does not exist"**
**Erro:** `ERROR: 42703: column "company_name" of relation "system_general_config" does not exist`

**Causa:** A tabela pode ter sido criada parcialmente ou com estrutura diferente.

**Solução:** 
1. Execute primeiro: `DROP TABLE IF EXISTS system_general_config;`
2. Execute a migração completa novamente
3. A migração corrigida usa `DROP TABLE IF EXISTS` para garantir criação limpa

### **Problema: Erro ao salvar configurações**
**Solução:** Verifique se a migração foi aplicada corretamente

### **Problema: Upload de logo falha**
**Solução:** Verifique se o diretório `documentos/sistema/logos/` existe e tem permissões

### **Problema: Configurações não carregam**
**Solução:** Verifique se a tabela `system_general_config` foi criada e tem dados

---

## 📞 **Suporte**

Se encontrar problemas durante a implementação:
1. Verifique os logs do servidor
2. Confirme se todas as migrações foram aplicadas
3. Teste cada funcionalidade individualmente
4. Consulte a documentação do Supabase se necessário

**Status:** ✅ Pronto para deploy e teste

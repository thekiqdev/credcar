# Instruções para Aplicar Migração dos Novos Campos do Cliente

## 📋 **Resumo da Migração**

Esta migração adiciona novos campos à tabela `clients` para armazenar informações mais detalhadas dos clientes:

### **🔍 Novos Campos Adicionados:**

#### **Identificação:**
- `rg` - Registro Geral
- `birth_date` - Data de nascimento
- `nationality` - Nacionalidade
- `marital_status` - Estado civil
- `spouse_name` - Nome do cônjuge
- `spouse_phone` - Telefone do cônjuge

#### **Dados Profissionais:**
- `company` - Empresa onde trabalha
- `salary` - Salário (DECIMAL)
- `position` - Cargo

#### **Referências Pessoais:**
- `reference_name` - Nome da referência
- `reference_address` - Endereço da referência
- `reference_phone` - Telefone da referência

## 🚀 **Como Aplicar a Migração**

### **Opção 1: Via Supabase Dashboard (Recomendado)**

1. **Acesse o Supabase Dashboard**
   - Vá para [supabase.com](https://supabase.com)
   - Faça login na sua conta
   - Selecione o projeto CredCar

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute a Migração**
   - Copie o conteúdo do arquivo `supabase/migrations/20250115000001_add_client_extended_fields.sql`
   - Cole no editor SQL
   - Clique em "Run" para executar

### **Opção 2: Via CLI do Supabase**

```bash
# Se você tem o CLI do Supabase instalado
supabase db push
```

## ✅ **Verificação**

Após aplicar a migração, verifique se os campos foram criados:

```sql
-- Verificar estrutura da tabela clients
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;
```

## 🔧 **Funcionalidades Implementadas**

### **Frontend:**
- ✅ Formulário expandido com novos campos
- ✅ Formatação automática (RG, Salário, Telefones)
- ✅ Validação de campos obrigatórios
- ✅ Interface organizada em cards

### **Backend:**
- ✅ Salvamento dos novos campos na tabela `clients`
- ✅ Atualização de clientes existentes
- ✅ Criação de novos clientes com campos completos
- ✅ Edição de informações do cliente

## 📊 **Estrutura Final da Tabela `clients`**

```sql
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  -- Novos campos
  rg TEXT,
  birth_date DATE,
  nationality TEXT,
  marital_status TEXT,
  spouse_name TEXT,
  spouse_phone TEXT,
  company TEXT,
  salary DECIMAL(10,2),
  position TEXT,
  reference_name TEXT,
  reference_address TEXT,
  reference_phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 **Próximos Passos**

1. **Aplicar a migração** no banco de dados
2. **Testar o formulário** de cadastro de cliente
3. **Verificar se os dados** estão sendo salvos corretamente
4. **Testar a edição** de informações do cliente

---

**⚠️ Importante:** Certifique-se de fazer backup do banco de dados antes de aplicar a migração em produção!

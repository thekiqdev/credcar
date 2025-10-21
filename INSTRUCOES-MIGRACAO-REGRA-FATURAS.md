# Instruções para Aplicar Migração: Regras de Geração de Faturas

## 📋 **Descrição da Migração**
Esta migração adiciona novas configurações para controlar as regras de geração automática de faturas no sistema.

## 🆕 **Novas Configurações Adicionadas**

### 1. **Dia Fixo de Vencimento**
- **Chave:** `payment.invoice.generation.fixed.day`
- **Valores:** 1-31
- **Padrão:** `20`
- **Descrição:** Dia do mês para vencimento das faturas

### 2. **Dias de Antecedência** (já existente)
- **Chave:** `payment.invoice.generation.days.advance`
- **Valores:** 1-30
- **Padrão:** `15`
- **Descrição:** Dias antes do vencimento para gerar a fatura

## 🔧 **Como Aplicar**

### **Opção 1: Via Supabase Dashboard**
1. Acesse o Supabase Dashboard
2. Vá para "SQL Editor"
3. Cole o conteúdo do arquivo `20250128000001_add_invoice_generation_rules.sql`
4. Execute a query

### **Opção 2: Via CLI do Supabase**
```bash
# Se você tem o CLI do Supabase instalado
supabase db push

# Ou aplicar migração específica
supabase migration up --file 20250128000001_add_invoice_generation_rules.sql
```

### **Opção 3: Via psql (PostgreSQL)**
```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f 20250128000001_add_invoice_generation_rules.sql
```

## ✅ **Verificação Pós-Migração**

Após aplicar a migração, verifique se as configurações foram criadas:

```sql
SELECT key, value, description 
FROM system_config 
WHERE category = 'payment' 
AND key LIKE '%invoice.generation%'
ORDER BY key;
```

**Resultado esperado:**
```
payment.invoice.generation.days.advance | 15 | Dias de antecedência para geração automática de faturas
payment.invoice.generation.fixed.day   | 20 | Dia fixo do mês para vencimento de faturas (1-31)
```

## 🎯 **Funcionalidades Implementadas**

### **Interface Administrativa:**
- ✅ Campo para dia fixo de vencimento (1-31)
- ✅ Campo para dias de antecedência (1-30)
- ✅ Exemplo prático dinâmico
- ✅ Validação de valores
- ✅ Descrições explicativas

### **Backend:**
- ✅ Carregamento das configurações do banco
- ✅ Salvamento das configurações no banco
- ✅ Valores padrão definidos
- ✅ Tratamento de erros

## 🚀 **Próximos Passos**

1. **Aplicar a migração** no banco de dados
2. **Testar a interface** de configurações
3. **Implementar a lógica** nos serviços de geração de faturas
4. **Atualizar o cronjob** para usar as novas regras

## ⚠️ **Importante**

- A migração é **segura** e não afeta dados existentes
- As configurações têm **valores padrão** definidos
- A interface já está **funcional** após a migração
- O sistema continuará funcionando com a regra atual até que seja alterada

# Correção do Erro 406 no Login de Cliente

## 🐛 Problema Identificado

**Erro**: `406 (Not Acceptable)` ao tentar fazer login com CPF do cliente.

**Causa Raiz**: 
1. O campo `password_hash` pode não existir na tabela `clients` (migration não aplicada)
2. O campo `password_hash` não está nos tipos TypeScript do Supabase
3. Possível problema com RLS (Row Level Security) bloqueando acesso

---

## ✅ Solução Implementada

### 1. Query com Fallback Inteligente

Modificada a função `authenticateWithCpf()` para:

1. **Primeira tentativa**: Buscar cliente sem `password_hash`
2. **Se erro 406**: Tentar novamente incluindo `password_hash`
3. **Se ainda erro 406**: Usar fallback sem `password_hash` e continuar com autenticação antiga

### 2. Validação de CPF Melhorada

- Validação de comprimento (11 dígitos para CPF, 14 para CNPJ)
- Logs detalhados para debug

### 3. Tratamento de Erros Melhorado

- Logs detalhados de erros
- Mensagens específicas para erro 406
- Instruções de troubleshooting no console

---

## 🔧 Código Modificado

**Arquivo**: `src/lib/supabase.ts` - Função `authenticateWithCpf()`

### Antes:
```typescript
const { data: client, error } = await supabase
  .from("clients")
  .select("*")
  .eq("cpf_cnpj", cleanCpf)
  .single();
```

### Depois:
```typescript
// Tentar primeiro sem password_hash
let { data: client, error } = await supabase
  .from("clients")
  .select("id, full_name, name, email, phone, cpf_cnpj, created_at, updated_at, ...")
  .eq("cpf_cnpj", cleanCpf)
  .single();

// Se erro 406, tentar com password_hash
if (error && error.code === "PGRST406") {
  // Retry com password_hash
}

// Se ainda erro 406, usar fallback sem password_hash
if (error && error.code === "PGRST406") {
  // Fallback query
}
```

---

## 📋 Checklist de Verificação

### 1. Verificar se Migration foi Aplicada

Execute no Supabase SQL Editor:

```sql
-- Verificar se coluna password_hash existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'password_hash';
```

**Se não existir**, execute a migration:
```sql
-- Executar migration-add-client-password.sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_hash TEXT;
```

### 2. Verificar RLS Policies

Execute no Supabase SQL Editor:

```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'clients';
```

**Se não houver políticas permitindo leitura**, crie uma:

```sql
-- Permitir leitura pública temporária (para teste)
CREATE POLICY "Allow public read clients" 
ON public.clients 
FOR SELECT 
USING (true);
```

### 3. Verificar se Cliente Existe

Execute no Supabase SQL Editor:

```sql
-- Verificar se cliente existe com o CPF
SELECT id, full_name, cpf_cnpj, password_hash 
FROM clients 
WHERE cpf_cnpj = '42813108863';
```

**Se não existir**, o CPF pode estar com formatação diferente no banco.

---

## 🧪 Como Testar

1. **Abrir Console do Navegador** (F12)
2. **Tentar fazer login** com CPF e senha
3. **Verificar logs** no console:
   - "Attempting to authenticate client with CPF: ..."
   - "Client found: ..." ou "Client not found..."
   - Qualquer erro 406 será logado com detalhes

### Logs Esperados (Sucesso):

```
Attempting to authenticate client with CPF: 42813108863
Client found: { id: X, name: "...", cpf: "42813108863" }
Password verification...
Client authenticated successfully: X
```

### Logs de Erro 406:

```
Error fetching client: [Error object]
Error code: PGRST406
Error message: ...
406 Error - Possible RLS issue or missing password_hash column
Please check:
1. If password_hash column exists in clients table
2. If RLS policies allow reading clients
```

---

## 🔍 Troubleshooting

### Problema: Ainda recebe erro 406

**Soluções**:

1. **Aplicar Migration**:
   ```sql
   ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_hash TEXT;
   ```

2. **Verificar RLS**:
   ```sql
   -- Desabilitar RLS temporariamente para teste
   ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
   
   -- Ou criar política permissiva
   CREATE POLICY "Allow all" ON public.clients FOR ALL USING (true);
   ```

3. **Verificar CPF no Banco**:
   ```sql
   -- Verificar formato do CPF no banco
   SELECT cpf_cnpj FROM clients WHERE cpf_cnpj LIKE '%42813108863%';
   ```

### Problema: Cliente não encontrado

**Soluções**:

1. Verificar se CPF está correto no banco (sem formatação)
2. Verificar se há espaços ou caracteres especiais
3. Tentar buscar com LIKE:
   ```sql
   SELECT * FROM clients WHERE cpf_cnpj LIKE '%42813108863%';
   ```

### Problema: Senha não funciona

**Soluções**:

1. Verificar se `password_hash` foi criado corretamente
2. Verificar se senha foi alterada usando `clientService.updatePassword()`
3. Tentar resetar senha pelo admin dashboard

---

## 📝 Próximos Passos

1. **Aplicar Migration** (se ainda não aplicada)
2. **Verificar RLS Policies** no Supabase
3. **Testar Login** novamente
4. **Verificar Logs** no console do navegador
5. **Atualizar Tipos TypeScript** (opcional):
   ```bash
   npm run types:supabase
   ```

---

## ✅ Status

- [x] Query com fallback implementada
- [x] Validação de CPF melhorada
- [x] Logs detalhados adicionados
- [x] Tratamento de erro 406 implementado
- [ ] Migration aplicada no Supabase (verificar)
- [ ] RLS policies verificadas (verificar)
- [ ] Tipos TypeScript atualizados (opcional)

---

**Data**: Janeiro 2025  
**Status**: ✅ Correção Implementada - Aguardando Verificação

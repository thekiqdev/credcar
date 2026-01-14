# Correção de Segurança e Problema de Senha

## 🔒 Problemas Corrigidos

### 1. Logs Inseguros Removidos

**Problema**: Logs estavam expondo dados sensíveis do cliente (nome, CPF, email) quando havia erro de autenticação.

**Solução**: 
- Removidos logs que expõem dados pessoais
- Mantidos apenas logs genéricos de erro
- Logs de debug apenas em desenvolvimento

**Antes**:
```typescript
console.log("Client found:", {
  id: client.id,
  name: client.full_name || client.name,
  cpf: client.cpf_cnpj,  // ❌ Expõe CPF
});
console.log("Password verification failed for client:", client.id);
```

**Depois**:
```typescript
console.log("Client found, verifying password...");  // ✅ Genérico
console.log("Authentication failed: invalid credentials");  // ✅ Genérico
```

---

### 2. Busca de password_hash Corrigida

**Problema**: Quando o cliente era encontrado através de busca manual (removendo formatação), o `password_hash` não estava sendo incluído na query.

**Solução**:
- Adicionada busca explícita de `password_hash` quando não está presente
- Incluído `password_hash` na busca com LIKE
- Verificação dupla após salvar senha

---

### 3. Logs de Debug Adicionados

Adicionados logs temporários para debug (podem ser removidos depois):

- Verificação se `password_hash` foi encontrado
- Verificação se hash foi salvo corretamente
- Verificação se hash corresponde à senha

---

## 🔍 Como Verificar o Problema da Senha

### 1. Verificar se password_hash foi Salvo

Execute no Supabase SQL Editor:

```sql
-- Verificar se password_hash existe para o cliente
SELECT 
    id,
    full_name,
    cpf_cnpj,
    password_hash IS NOT NULL as has_password,
    LENGTH(password_hash) as hash_length,
    SUBSTRING(password_hash, 1, 10) as hash_preview
FROM clients
WHERE id = 53;  -- ID do cliente encontrado
```

**Se `has_password` for `false`**:
- A senha não foi salva corretamente
- Verifique se a migration foi aplicada
- Verifique se há erro ao salvar

**Se `hash_length` for diferente de 64**:
- O hash não está no formato correto (SHA-256 deve ter 64 caracteres hexadecimais)

### 2. Testar Hash Manualmente

Execute no Supabase SQL Editor para ver o hash atual:

```sql
SELECT password_hash 
FROM clients 
WHERE id = 53;
```

Depois, gere o hash da senha que você está usando e compare:

```javascript
// No console do navegador
const password = "sua_senha_aqui";
const encoder = new TextEncoder();
const data = encoder.encode(password);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
console.log("Hash da senha:", hashHex);
```

Compare com o hash do banco.

### 3. Verificar Logs no Console

Ao tentar fazer login, verifique os logs:

```
Client found, verifying password...
Fetching password_hash separately...  (se não estava na query)
Password hash retrieved  (ou "No password_hash found")
Verifying password with hash...
Password hash verification failed  (ou "successful")
```

---

## 🐛 Possíveis Causas do Problema

### 1. password_hash Não Foi Salvo

**Sintomas**:
- Log mostra "No password_hash found"
- Query SQL mostra `has_password = false`

**Solução**:
- Verificar se `updatePassword()` foi executado sem erros
- Verificar se há políticas RLS bloqueando UPDATE
- Tentar salvar senha novamente pelo AdminDashboard

### 2. Hash Não Corresponde

**Sintomas**:
- Log mostra "Password hash verification failed"
- Hash existe no banco mas não corresponde

**Possíveis causas**:
- Senha foi alterada mas hash antigo ainda está no banco
- Hash foi gerado com algoritmo diferente
- Senha tem espaços ou caracteres especiais

**Solução**:
- Resetar senha pelo AdminDashboard
- Verificar se a senha não tem espaços extras
- Verificar se está usando a senha correta

### 3. Problema com RLS

**Sintomas**:
- Erro ao buscar `password_hash`
- Erro ao salvar `password_hash`

**Solução**:
- Verificar políticas RLS na tabela `clients`
- Criar política que permite UPDATE de `password_hash`:

```sql
CREATE POLICY "Allow password update" 
ON public.clients 
FOR UPDATE 
USING (true)
WITH CHECK (true);
```

---

## ✅ Próximos Passos

1. **Testar Login Novamente**
   - Verificar logs no console
   - Verificar se `password_hash` está sendo encontrado
   - Verificar se verificação está funcionando

2. **Se Ainda Não Funcionar**:
   - Execute a query SQL para verificar `password_hash`
   - Compare hash manualmente
   - Resetar senha pelo AdminDashboard

3. **Remover Logs de Debug** (depois que funcionar):
   - Remover logs temporários
   - Manter apenas logs genéricos de segurança

---

## 🔒 Melhorias de Segurança Implementadas

- ✅ Removidos logs que expõem CPF
- ✅ Removidos logs que expõem nome do cliente
- ✅ Removidos logs que expõem email
- ✅ Mensagens de erro genéricas
- ✅ Logs apenas para debug técnico (sem dados pessoais)

---

**Data**: Janeiro 2025  
**Status**: ✅ Correções Implementadas - Aguardando Teste

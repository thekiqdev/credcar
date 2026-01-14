# Correção - Cliente Não Encontrado (PGRST116)

## 🐛 Problema Atual

**Erro**: `PGRST116 - JSON object requested, multiple (or no) rows returned`

**Significado**: O cliente com CPF `42813108863` não foi encontrado no banco de dados.

---

## 🔍 Possíveis Causas

1. **CPF não existe no banco**
   - O cliente pode não ter sido cadastrado ainda
   - O CPF pode estar em outra tabela (ex: criado através de contrato)

2. **CPF com formatação diferente**
   - CPF pode estar armazenado como `428.131.088-63`
   - CPF pode ter espaços ou outros caracteres
   - CPF pode estar em maiúsculas/minúsculas

3. **Problema com RLS (Row Level Security)**
   - Políticas RLS podem estar bloqueando a leitura
   - Usuário anônimo pode não ter permissão

---

## ✅ Solução Implementada

### 1. Busca Inteligente com Múltiplas Estratégias

O código agora tenta encontrar o cliente usando:

1. **Busca Exata**: `cpf_cnpj = '42813108863'`
2. **Busca com LIKE**: `cpf_cnpj LIKE '%42813108863%'`
3. **Busca Manual**: Busca todos e filtra removendo formatação

### 2. Logs Detalhados

O código agora mostra no console:
- Resultado de cada tentativa de busca
- CPFs de exemplo do banco
- Formato dos CPFs encontrados
- Mensagens de troubleshooting

### 3. Uso de `maybeSingle()`

Mudado de `.single()` para `.maybeSingle()` para não lançar erro quando não encontrar.

---

## 🔧 Como Verificar

### 1. Execute o Script SQL

Execute `verificar-cpf-cliente.sql` no Supabase SQL Editor para verificar:

- Se o CPF existe no banco
- Qual o formato do CPF armazenado
- Se há password_hash definido
- Status das políticas RLS

### 2. Verifique os Logs no Console

Ao tentar fazer login, verifique no console do navegador:

```
Searching for client with CPF: 42813108863
First query result: { client: null, error: null }
Client not found with exact match, trying LIKE search...
LIKE search result: ...
Sample CPFs in database: [...]
```

### 3. Verifique no AdminDashboard

1. Acesse o AdminDashboard
2. Vá para a aba "Clientes"
3. Busque pelo CPF `42813108863`
4. Verifique se o cliente existe e qual o formato do CPF

---

## 📋 Próximos Passos

### Se o Cliente Não Existe:

1. **Criar o cliente** através do AdminDashboard
2. **Ou criar através de contrato** (o cliente será criado automaticamente)

### Se o CPF Tem Formatação Diferente:

1. **Normalizar CPFs no banco**:
   ```sql
   UPDATE clients 
   SET cpf_cnpj = REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '')
   WHERE cpf_cnpj IS NOT NULL;
   ```

2. **Ou ajustar a busca** para aceitar formatação (já implementado)

### Se Há Problema com RLS:

1. **Verificar políticas RLS**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'clients';
   ```

2. **Criar política permissiva** (se necessário):
   ```sql
   CREATE POLICY "Allow public read clients" 
   ON public.clients 
   FOR SELECT 
   USING (true);
   ```

---

## 🧪 Teste Agora

1. **Tente fazer login novamente**
2. **Abra o Console do Navegador** (F12)
3. **Verifique os logs**:
   - Deve mostrar tentativas de busca
   - Deve mostrar CPFs de exemplo
   - Deve mostrar se encontrou ou não

4. **Execute o script SQL** `verificar-cpf-cliente.sql` para verificar no banco

---

## 📝 Logs Esperados

### Se Cliente Não Existe:

```
Searching for client with CPF: 42813108863
First query result: { client: null, error: null }
Client not found with exact match, trying LIKE search...
LIKE search result: { data: null, error: null }
Sample CPFs in database: [...]
Client not found even with manual filtering
```

### Se Cliente Existe com Formatação Diferente:

```
Searching for client with CPF: 42813108863
First query result: { client: null, error: null }
Client not found with exact match, trying LIKE search...
Found client with LIKE search: 428.131.088-63
```

### Se Cliente Existe:

```
Searching for client with CPF: 42813108863
First query result: { client: {...}, error: null }
Client found: { id: X, name: "...", cpf: "42813108863" }
```

---

**Data**: Janeiro 2025  
**Status**: ✅ Correção Implementada - Aguardando Verificação no Banco

# Instruções para Aplicar Migração no Supabase

## 🚨 Problema Atual

O erro indica que o campo `password_hash` não existe na tabela `clients` no Supabase. Isso impede o login de clientes.

## ✅ Solução

### Passo 1: Acessar o Supabase Dashboard

1. Acesse [supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione o projeto **CredCar**

### Passo 2: Abrir o SQL Editor

1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"** ou use o editor existente

### Passo 3: Executar a Migração

1. Abra o arquivo `aplicar-migracao-supabase.sql`
2. Copie **TODO** o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Passo 4: Verificar se Funcionou

Após executar, você deve ver:
- Mensagem de sucesso indicando que a coluna foi adicionada
- Resultado da verificação mostrando que a coluna existe
- Estatísticas de quantos clientes têm senha

### Passo 5: Criar Senha Inicial para Clientes Existentes (Opcional)

Se você quiser criar senhas padrão para clientes existentes:

1. No arquivo `aplicar-migracao-supabase.sql`, descomente a seção "OPCIONAL"
2. Ajuste a senha padrão se necessário (padrão: `123456`)
3. Execute novamente apenas essa seção

**⚠️ IMPORTANTE**: Se criar senhas padrão, informe os clientes para alterarem após o primeiro login!

---

## 🔍 Verificação Manual

Execute esta query no Supabase para verificar se a migração foi aplicada:

```sql
-- Verificar se coluna password_hash existe
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'password_hash';
```

**Resultado esperado**: Deve retornar uma linha com `password_hash` do tipo `text`.

---

## 🐛 Troubleshooting

### Erro: "column already exists"
- ✅ Isso significa que a migração já foi aplicada
- Verifique se há outros problemas

### Erro: "permission denied"
- Verifique se você tem permissões de administrador no projeto
- Tente executar como superuser

### Erro: "relation clients does not exist"
- Verifique se o nome da tabela está correto
- Pode ser que a tabela tenha outro nome no seu projeto

---

## 📝 Próximos Passos

Após aplicar a migração:

1. ✅ Teste o login de um cliente
2. ✅ Se necessário, crie senha inicial para clientes existentes
3. ✅ Informe clientes para alterarem senha após primeiro login
4. ✅ Remova logs de debug se houver

---

**Data**: Janeiro 2025  
**Versão**: 1.0

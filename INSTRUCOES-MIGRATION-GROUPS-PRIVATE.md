# Instruções para Aplicar Migration - Campo is_private em Groups

## O que foi implementado

Foi adicionado um campo `is_private` na tabela `groups` para permitir que o administrador marque grupos como privados. Grupos privados podem ser visualizados por representantes, mas não podem ser selecionados por eles.

## Como aplicar a migration

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**
5. Cole o seguinte SQL:

```sql
-- Add is_private column to groups table
ALTER TABLE groups
ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_is_private ON groups (is_private);

-- Add comment for documentation
COMMENT ON COLUMN groups.is_private IS 'Define se o grupo é privado (apenas admin pode selecionar) ou público';
```

6. Clique em **Run** para executar a query
7. Verifique se a execução foi bem-sucedida

## Verificar se a migration foi aplicada

Execute esta query no SQL Editor para verificar:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'groups' AND column_name = 'is_private';
```

Você deverá ver algo como:

| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| is_private  | boolean   | NO          | false          |

## Funcionalidades Implementadas

### 1. Botão de Editar Grupo
- Adicionado botão de editar (ícone de lápis) na tabela de grupos
- Permite editar nome, descrição e status privado do grupo

### 2. Campo "Privado" na Criação/Edição de Grupo
- Checkbox para marcar grupo como privado
- Grupos privados são acessíveis apenas por administradores

### 3. Coluna "Privado" na Tabela
- Nova coluna mostrando se o grupo é privado ou não
- Badge laranja para "Sim" e cinza para "Não"

### 4. Filtro para Representantes
- Grupos privados aparecem na lista para representantes
- Mas ficam desabilitados (não podem ser selecionados)
- Mostram badge "Privado" e texto "(Somente Admin)"

## Arquivos Modificados

1. `supabase/migrations/20250114000001_add_is_private_to_groups.sql` - Migration SQL
2. `src/components/dashboard/AdminDashboard.tsx` - Interface de administração de grupos
3. `src/components/sales/QuotaSelection.tsx` - Seleção de grupos e cotas

## Próximos Passos

Após aplicar a migration:

1. Teste criar um novo grupo e marcá-lo como privado
2. Teste editar um grupo existente
3. Faça login como representante e tente selecionar um grupo privado (deve estar desabilitado)
4. Faça login como admin e verifique se pode selecionar grupos privados

## Troubleshooting

Se encontrar erro ao executar a migration:

1. Verifique se a coluna já existe:
   ```sql
   SELECT * FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'is_private';
   ```

2. Se a coluna já existir, você pode pular a migration ou remover a coluna primeiro:
   ```sql
   ALTER TABLE groups DROP COLUMN IF EXISTS is_private;
   ```
   E então executar a migration novamente.


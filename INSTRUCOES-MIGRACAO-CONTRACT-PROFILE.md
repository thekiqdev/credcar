# INSTRUÇÕES PARA APLICAR MIGRAÇÃO CONTRACT_PROFILE

## Problema
O erro "invalid input syntax for type integer" indica que a coluna `contract_profile` não existe na tabela `profiles` ou está com tipo incorreto.

## Solução

### Opção 1: Via Supabase SQL Editor (RECOMENDADO)
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Execute o script abaixo:

```sql
-- Verificar se a coluna existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'contract_profile';

-- Se não existir, adicionar a coluna
ALTER TABLE profiles ADD COLUMN contract_profile TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_profiles_contract_profile ON profiles (contract_profile);

-- Adicionar comentário
COMMENT ON COLUMN profiles.contract_profile IS 'Link para download do contrato do representante';

-- Verificar resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'contract_profile';
```

### Opção 2: Via Script Node.js
1. Execute: `node apply-contract-profile-migration.js`
2. Certifique-se de ter as variáveis de ambiente configuradas

### Opção 3: Via Script SQL Simples
1. Execute o arquivo: `simple-contract-profile-migration.sql`

## Verificação
Após aplicar a migração, teste o upload de contrato representante novamente.

## Arquivos Criados
- `fix-contract-profile-migration.sql` - Script completo com verificações
- `simple-contract-profile-migration.sql` - Script simples
- `apply-contract-profile-migration.js` - Script Node.js
- Endpoint de teste: `/api/test-contract-profile-migration`

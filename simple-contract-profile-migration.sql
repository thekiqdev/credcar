-- MIGRAÇÃO SIMPLES PARA CONTRACT_PROFILE
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna contract_profile se não existir
DO $$
BEGIN
    -- Verificar se a coluna existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'contract_profile'
    ) THEN
        -- Adicionar a coluna
        ALTER TABLE profiles ADD COLUMN contract_profile TEXT;
        RAISE NOTICE 'Coluna contract_profile adicionada';
    ELSE
        RAISE NOTICE 'Coluna contract_profile já existe';
    END IF;
END $$;

-- 2. Criar índice
CREATE INDEX IF NOT EXISTS idx_profiles_contract_profile ON profiles (contract_profile);

-- 3. Adicionar comentário
COMMENT ON COLUMN profiles.contract_profile IS 'Link para download do contrato do representante';

-- 4. Verificar resultado
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'contract_profile';

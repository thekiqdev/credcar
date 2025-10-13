-- Script para verificar e aplicar migração contract_profile
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a coluna contract_profile existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'contract_profile';

-- 2. Se a coluna não existir ou estiver com tipo incorreto, aplicar a migração
DO $$
BEGIN
    -- Verificar se a coluna existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'contract_profile'
    ) THEN
        -- Adicionar a coluna se não existir
        ALTER TABLE profiles ADD COLUMN contract_profile TEXT;
        RAISE NOTICE 'Coluna contract_profile adicionada à tabela profiles';
    ELSE
        -- Verificar se o tipo está correto
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'contract_profile' 
            AND data_type != 'text'
        ) THEN
            -- Alterar o tipo se estiver incorreto
            ALTER TABLE profiles ALTER COLUMN contract_profile TYPE TEXT;
            RAISE NOTICE 'Tipo da coluna contract_profile corrigido para TEXT';
        ELSE
            RAISE NOTICE 'Coluna contract_profile já existe com tipo correto';
        END IF;
    END IF;
END $$;

-- 3. Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_profiles_contract_profile ON profiles (contract_profile);

-- 4. Adicionar comentário
COMMENT ON COLUMN profiles.contract_profile IS 'Link para download do contrato do representante';

-- 5. Verificar resultado final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'contract_profile';

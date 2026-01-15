-- ============================================
-- MIGRAÇÃO: Adicionar campo password_hash na tabela clients
-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- ============================================

-- 1. Adicionar coluna password_hash se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE clients 
        ADD COLUMN password_hash TEXT;
        
        COMMENT ON COLUMN clients.password_hash IS 'Hash SHA-256 da senha do cliente';
        
        RAISE NOTICE 'Coluna password_hash adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna password_hash já existe';
    END IF;
END $$;

-- 2. Criar índice para busca rápida por CPF (se não existir)
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON clients(cpf_cnpj);

-- 3. Criar função para atualizar updated_at automaticamente (se não existir)
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para atualizar updated_at (se não existir)
DROP TRIGGER IF EXISTS trigger_update_clients_updated_at ON clients;
CREATE TRIGGER trigger_update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();

-- 5. Comentários para documentação
COMMENT ON TABLE clients IS 'Tabela de clientes do sistema CredCar';
COMMENT ON COLUMN clients.cpf_cnpj IS 'CPF ou CNPJ do cliente (sem formatação)';

-- 6. Verificar se a migração foi aplicada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'password_hash';

-- ============================================
-- OPCIONAL: Criar senha inicial para clientes existentes
-- Descomente e ajuste conforme necessário
-- ============================================

-- Exemplo: Criar senha padrão "123456" para clientes sem senha
-- ATENÇÃO: Isso cria uma senha temporária. Clientes devem alterar após primeiro login.
/*
DO $$
DECLARE
    client_record RECORD;
    password_hash TEXT;
BEGIN
    -- Hash SHA-256 de "123456"
    password_hash := '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
    
    -- Atualizar todos os clientes sem password_hash
    UPDATE clients
    SET password_hash = password_hash
    WHERE password_hash IS NULL;
    
    RAISE NOTICE 'Senhas padrão criadas para % clientes', (SELECT COUNT(*) FROM clients WHERE password_hash = password_hash);
END $$;
*/

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar quantos clientes têm password_hash
SELECT 
    COUNT(*) as total_clientes,
    COUNT(password_hash) as clientes_com_senha,
    COUNT(*) - COUNT(password_hash) as clientes_sem_senha
FROM clients;

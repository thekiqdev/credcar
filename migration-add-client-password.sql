-- Migration: Adicionar campo password_hash na tabela clients
-- Data: Janeiro 2025
-- Descrição: Adiciona campo para armazenar hash de senha dos clientes

-- Adicionar coluna password_hash se não existir
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
    END IF;
END $$;

-- Criar índice para busca rápida por CPF (se não existir)
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON clients(cpf_cnpj);

-- Criar função para atualizar updated_at automaticamente (se não existir)
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at (se não existir)
DROP TRIGGER IF EXISTS trigger_update_clients_updated_at ON clients;
CREATE TRIGGER trigger_update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();

-- Comentários para documentação
COMMENT ON TABLE clients IS 'Tabela de clientes do sistema CredCar';
COMMENT ON COLUMN clients.cpf_cnpj IS 'CPF ou CNPJ do cliente (sem formatação)';

-- Migration: Remover constraint UNIQUE do campo cpf_cnpj na tabela clients
-- Data: 2025-01-06
-- Descrição: Permite que o mesmo cliente (CPF/CNPJ) tenha múltiplos contratos

-- Remover a constraint UNIQUE do campo cpf_cnpj
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_cpf_cnpj_key;

-- Adicionar comentário explicativo
COMMENT ON COLUMN clients.cpf_cnpj IS 'CPF/CNPJ do cliente - permite múltiplos contratos para o mesmo documento';

-- Criar índice para melhorar performance (sem constraint UNIQUE)
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj_performance 
ON clients(cpf_cnpj);

-- Log da migration
INSERT INTO migration_log (migration_name, applied_at) 
VALUES ('remove_cpf_cnpj_unique_constraint', NOW())
ON CONFLICT DO NOTHING;

-- Executar migração para adicionar plan_id na tabela contracts
-- Arquivo: execute-migration-plan-id-contracts.sql

-- Adicionar coluna plan_id na tabela contracts
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS plan_id INTEGER;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_contracts_plan_id ON public.contracts (plan_id);

-- Adicionar foreign key constraint para planos
ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_plan_id
FOREIGN KEY (plan_id) REFERENCES public.planos(id);

-- Migrar dados existentes: commission_table_id -> plan_id
UPDATE public.contracts
SET plan_id = commission_table_id
WHERE commission_table_id IS NOT NULL AND plan_id IS NULL;



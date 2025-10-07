-- Migração para adicionar plan_id na tabela contracts
-- Arquivo: supabase/migrations/20251006000003_add_plan_id_to_contracts.sql

-- Adicionar coluna plan_id na tabela contracts
ALTER TABLE public.contracts
ADD COLUMN plan_id INTEGER;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_contracts_plan_id ON public.contracts (plan_id);

-- Adicionar foreign key constraint para planos
ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_plan_id
FOREIGN KEY (plan_id) REFERENCES public.planos(id);

-- Migrar dados existentes: commission_table_id -> plan_id
-- Assumindo que commission_table_id corresponde ao plan_id
UPDATE public.contracts
SET plan_id = commission_table_id
WHERE commission_table_id IS NOT NULL;

-- Verificar migração
SELECT 
    id,
    commission_table_id,
    plan_id,
    credit_amount,
    status
FROM public.contracts
WHERE commission_table_id IS NOT NULL
LIMIT 5;



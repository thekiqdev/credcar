-- Script para atualizar contratos existentes com id_faixa_de_credito
-- Arquivo: update-existing-contracts-faixa.sql

-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a coluna existe (se não existir, criar)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'id_faixa_de_credito'
    ) THEN
        ALTER TABLE public.contracts ADD COLUMN id_faixa_de_credito INTEGER;
        CREATE INDEX IF NOT EXISTS idx_contracts_id_faixa_de_credito ON public.contracts (id_faixa_de_credito);
        ALTER TABLE public.contracts ADD CONSTRAINT fk_contracts_id_faixa_de_credito FOREIGN KEY (id_faixa_de_credito) REFERENCES public.faixas_de_credito(id);
    END IF;
END $$;

-- 2. Atualizar contrato 40 (R$ 20.000) - usar faixa ID 121
UPDATE public.contracts 
SET id_faixa_de_credito = 121 
WHERE id = 40 AND credit_amount = '20000';

-- 3. Atualizar contrato 41 (R$ 20.000) - usar faixa ID 121
UPDATE public.contracts 
SET id_faixa_de_credito = 121 
WHERE id = 41 AND credit_amount = '20000';

-- 4. Verificar se as atualizações funcionaram
SELECT 
    id,
    contract_code,
    credit_amount,
    id_faixa_de_credito,
    commission_table_id
FROM public.contracts 
WHERE id IN (40, 41);

-- 5. Verificar se a faixa ID 121 existe e tem os dados corretos
SELECT 
    id,
    valor_credito,
    valor_primeira_parcela,
    valor_parcelas_restantes,
    numero_total_parcelas
FROM public.faixas_de_credito 
WHERE id = 121;

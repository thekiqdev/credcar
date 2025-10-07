-- Script para executar a migração id_faixa_de_credito
-- Arquivo: execute-migration-id-faixa-de-credito.sql

-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna id_faixa_de_credito na tabela contracts
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS id_faixa_de_credito INTEGER;

-- 2. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_contracts_id_faixa_de_credito ON public.contracts (id_faixa_de_credito);

-- 3. Adicionar foreign key constraint para faixas_de_credito
ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_id_faixa_de_credito
FOREIGN KEY (id_faixa_de_credito) REFERENCES public.faixas_de_credito(id);

-- 4. Adicionar comentário para documentar a coluna
COMMENT ON COLUMN public.contracts.id_faixa_de_credito IS 'ID da faixa de crédito selecionada no momento da criação do contrato';

-- 5. Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contracts' AND column_name = 'id_faixa_de_credito';



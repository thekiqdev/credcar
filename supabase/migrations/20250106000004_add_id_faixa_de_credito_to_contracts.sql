-- Migração para adicionar coluna id_faixa_de_credito na tabela contracts
-- Arquivo: supabase/migrations/20250106000004_add_id_faixa_de_credito_to_contracts.sql

-- Adicionar coluna id_faixa_de_credito na tabela contracts
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS id_faixa_de_credito INTEGER;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_contracts_id_faixa_de_credito ON public.contracts (id_faixa_de_credito);

-- Adicionar foreign key constraint para faixas_de_credito
ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_id_faixa_de_credito
FOREIGN KEY (id_faixa_de_credito) REFERENCES public.faixas_de_credito(id);

-- Comentário para documentar a coluna
COMMENT ON COLUMN public.contracts.id_faixa_de_credito IS 'ID da faixa de crédito selecionada no momento da criação do contrato';



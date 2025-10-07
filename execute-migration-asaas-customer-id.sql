-- Executar migração para adicionar asaas_customer_id
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna asaas_customer_id à tabela clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(255) UNIQUE;

-- Criar índice para buscas mais rápidas
CREATE INDEX IF NOT EXISTS idx_clients_asaas_customer_id ON public.clients (asaas_customer_id);

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.clients.asaas_customer_id IS 'ID do cliente no sistema ASAAS para integração de pagamentos';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'asaas_customer_id';

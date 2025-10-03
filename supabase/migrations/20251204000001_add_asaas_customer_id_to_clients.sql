-- Migration: Add asaas_customer_id field to clients table
-- Purpose: Enable synchronization between local clients and ASAAS customers
-- Created: 2025-12-04

-- Add asaas_customer_id column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(100);

-- Add comment to document the purpose
COMMENT ON COLUMN public.clients.asaas_customer_id IS 'ID do cliente no ASAAS para sincronização de pagamentos';

-- Create index for better performance on ASAAS lookups
CREATE INDEX IF NOT EXISTS idx_clients_asaas_customer_id 
ON public.clients (asaas_customer_id);

-- Add index for CPF/CNPJ searches (if not exists)
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj 
ON public.clients (cpf_cnpj);

-- Sample data update example (commented out - for reference only)
-- UPDATE public.clients 
-- SET asaas_customer_id = 'cus_000007076006' 
-- WHERE email = 'thekiq@icloud.com' 
-- AND cpf_cnpj = '42813108863';

-- Log migration completion
INSERT INTO public.migration_log (migration_name, applied_at) 
VALUES ('add_asaas_customer_id_to_clients', NOW())
ON CONFLICT DO NOTHING;

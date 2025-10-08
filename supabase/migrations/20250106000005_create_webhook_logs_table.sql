-- Migration: Create webhook_logs table for ASAAS webhook auditing
-- Created: 2025-01-06
-- Purpose: Store webhook events for audit and debugging

CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    payment_id VARCHAR(100),
    invoice_id VARCHAR(100),
    asaas_status VARCHAR(50),
    local_status VARCHAR(50),
    payment_date TIMESTAMP,
    external_reference VARCHAR(100),
    raw_data TEXT,
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON public.webhook_logs (payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_invoice_id ON public.webhook_logs (invoice_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON public.webhook_logs (processed_at);

-- Add comments for documentation
COMMENT ON TABLE public.webhook_logs IS 'Log de eventos de webhook ASAAS para auditoria e debugging';
COMMENT ON COLUMN public.webhook_logs.event_type IS 'Tipo do evento (PAYMENT_RECEIVED, PAYMENT_OVERDUE, etc.)';
COMMENT ON COLUMN public.webhook_logs.payment_id IS 'ID do pagamento no ASAAS';
COMMENT ON COLUMN public.webhook_logs.invoice_id IS 'ID da fatura local';
COMMENT ON COLUMN public.webhook_logs.asaas_status IS 'Status no ASAAS';
COMMENT ON COLUMN public.webhook_logs.local_status IS 'Status mapeado para o sistema local';
COMMENT ON COLUMN public.webhook_logs.payment_date IS 'Data do pagamento';
COMMENT ON COLUMN public.webhook_logs.external_reference IS 'Referência externa (ID da fatura local)';
COMMENT ON COLUMN public.webhook_logs.raw_data IS 'Dados brutos do webhook em JSON';
COMMENT ON COLUMN public.webhook_logs.processed_at IS 'Data/hora do processamento';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
